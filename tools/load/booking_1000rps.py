#!/usr/bin/env python3
"""
Load test /booking with target requests-per-second.

Features:
- Target RPS pacing by second
- Multithread workers (stdlib only)
- Auto register/login (unless --token is provided)
- Live progress output
- Final latency stats: min/avg/p50/p90/p95/p99/max
- Status code breakdown
- Save per-request result to CSV
"""

import argparse
import csv
import json
import math
import queue
import random
import string
import threading
import time
import urllib.error
import urllib.request
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple


def now_ms() -> int:
    return int(time.time() * 1000)


def percentile(sorted_values: List[float], p: float) -> float:
    if not sorted_values:
        return float("nan")
    rank = max(0, min(len(sorted_values) - 1, math.ceil((p / 100.0) * len(sorted_values)) - 1))
    return sorted_values[rank]


def random_email(prefix: str) -> str:
    rnd = "".join(random.choice(string.ascii_lowercase + string.digits) for _ in range(8))
    return f"{prefix}_{rnd}@test.com"


def http_json(
    method: str,
    url: str,
    body: Optional[dict] = None,
    headers: Optional[Dict[str, str]] = None,
    timeout: float = 8.0,
) -> Tuple[int, dict]:
    req_headers = {"Accept": "application/json"}
    if headers:
        req_headers.update(headers)

    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        req_headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=data, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", errors="ignore")
            if raw:
                try:
                    return resp.status, json.loads(raw)
                except json.JSONDecodeError:
                    return resp.status, {"raw": raw}
            return resp.status, {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="ignore")
        if raw:
            try:
                return e.code, json.loads(raw)
            except json.JSONDecodeError:
                return e.code, {"raw": raw}
        return e.code, {}
    except Exception as e:
        return 0, {"error": str(e)}


@dataclass
class ReqResult:
    request_id: int
    status: int
    latency_ms: float
    error: str


class SharedState:
    def __init__(self, total_planned: int):
        self.total_planned = total_planned
        self.sent = 0
        self.completed = 0
        self.success_2xx = 0
        self.lock = threading.Lock()
        self.status_counter = Counter()
        self.results: List[ReqResult] = []
        self.start_ts = time.time()
        self.stop_signal = False

    def on_sent(self) -> None:
        with self.lock:
            self.sent += 1

    def on_completed(self, result: ReqResult) -> None:
        with self.lock:
            self.completed += 1
            if 200 <= result.status < 300:
                self.success_2xx += 1
            self.status_counter[result.status] += 1
            self.results.append(result)


def worker(
    worker_id: int,
    q: "queue.Queue[Tuple[int, dict, str]]",
    state: SharedState,
    base_url: str,
    timeout: float,
) -> None:
    while not state.stop_signal:
        try:
            request_id, body, token = q.get(timeout=0.2)
        except queue.Empty:
            if state.completed >= state.total_planned:
                return
            continue

        state.on_sent()
        t0 = time.perf_counter()
        status, payload = http_json(
            "POST",
            f"{base_url}/booking",
            body=body,
            headers={
                "Authorization": f"Bearer {token}",
                "Idempotency-Key": f"load-{request_id}-{now_ms()}",
            },
            timeout=timeout,
        )
        dt = (time.perf_counter() - t0) * 1000.0
        err = ""
        if status == 0:
            err = str(payload.get("error", "network_error"))
        state.on_completed(ReqResult(request_id=request_id, status=status, latency_ms=dt, error=err))
        q.task_done()


def progress_printer(state: SharedState, interval_sec: float = 1.0) -> None:
    last_completed = 0
    while not state.stop_signal:
        time.sleep(interval_sec)
        with state.lock:
            completed = state.completed
            sent = state.sent
            success = state.success_2xx
            status_snapshot = dict(state.status_counter)
        delta = completed - last_completed
        last_completed = completed
        elapsed = max(1e-6, time.time() - state.start_ts)
        achieved_rps = completed / elapsed
        success_rate = (success / completed * 100.0) if completed else 0.0
        print(
            f"[progress] sent={sent} completed={completed}/{state.total_planned} "
            f"delta={delta}/s achieved_rps={achieved_rps:.1f} "
            f"success_rate={success_rate:.2f}% statuses={status_snapshot}"
        )
        if completed >= state.total_planned:
            return


def ensure_token(base_url: str, email: str, password: str) -> str:
    # Register (idempotent for random email)
    http_json(
        "POST",
        f"{base_url}/auth/register",
        body={"email": email, "password": password, "name": "Load Test User", "role": "CUSTOMER"},
        timeout=10,
    )

    status, data = http_json(
        "POST",
        f"{base_url}/auth/login",
        body={"email": email, "password": password, "role": "CUSTOMER"},
        timeout=10,
    )
    if status != 200:
        raise RuntimeError(f"Login failed: status={status} body={data}")

    token = data.get("access_token") or data.get("accessToken") or data.get("token")
    if not token:
        raise RuntimeError(f"No access token in login response: {data}")
    return token


def make_booking_body() -> dict:
    # Keep route stable to reduce noise, randomize slightly to avoid backend dedupe.
    lat_base = 10.7602 + random.uniform(-0.0010, 0.0010)
    lng_base = 106.6602 + random.uniform(-0.0010, 0.0010)
    return {
        "pickup": {"lat": round(lat_base, 6), "lng": round(lng_base, 6)},
        "dropoff": {"lat": round(lat_base + 0.01, 6), "lng": round(lng_base + 0.01, 6)},
        "distanceKm": round(random.uniform(2.5, 7.0), 2),
        "durationMin": random.randint(6, 20),
        "vehicleType": "CAR",
    }


def save_csv(results: List[ReqResult], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["request_id", "status", "latency_ms", "error"])
        for r in results:
            writer.writerow([r.request_id, r.status, f"{r.latency_ms:.3f}", r.error])


def main() -> int:
    parser = argparse.ArgumentParser(description="Load test /booking with target RPS")
    parser.add_argument("--base-url", default="http://192.168.57.101:3000", help="API gateway URL")
    parser.add_argument("--rps", type=int, default=1000, help="Target requests per second")
    parser.add_argument("--duration", type=int, default=30, help="Duration in seconds")
    parser.add_argument("--workers", type=int, default=400, help="Worker threads")
    parser.add_argument("--timeout", type=float, default=8.0, help="Per-request timeout seconds")
    parser.add_argument("--token", default="", help="Existing customer access token (optional)")
    parser.add_argument("--email", default="", help="Email for auto login if token not provided")
    parser.add_argument("--password", default="123456", help="Password for auto login")
    parser.add_argument(
        "--csv",
        default="",
        help="CSV output file (default: reports/booking_1000rps_<ts>.csv)",
    )
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")
    total_planned = args.rps * args.duration
    if total_planned <= 0:
        raise SystemExit("rps * duration must be > 0")

    token = args.token.strip()
    if not token:
        email = args.email.strip() or random_email("load_booking")
        print(f"[setup] auto register/login email={email}")
        token = ensure_token(base_url, email, args.password)
        print("[setup] login success, token acquired")
    else:
        print("[setup] using provided token")

    q: "queue.Queue[Tuple[int, dict, str]]" = queue.Queue(maxsize=max(10000, total_planned))
    state = SharedState(total_planned=total_planned)

    threads = []
    for i in range(args.workers):
        t = threading.Thread(
            target=worker,
            args=(i, q, state, base_url, args.timeout),
            daemon=True,
        )
        t.start()
        threads.append(t)

    prog = threading.Thread(target=progress_printer, args=(state, 1.0), daemon=True)
    prog.start()

    print(
        f"[start] target={args.rps} req/s duration={args.duration}s total={total_planned} "
        f"workers={args.workers} timeout={args.timeout}s"
    )

    request_id = 0
    test_start = time.time()

    # Pace request enqueueing by second.
    for sec in range(args.duration):
        sec_start = test_start + sec
        for _ in range(args.rps):
            request_id += 1
            q.put((request_id, make_booking_body(), token))

        # Sleep to next second boundary.
        sleep_until = sec_start + 1.0
        remain = sleep_until - time.time()
        if remain > 0:
            time.sleep(remain)

    q.join()
    state.stop_signal = True
    prog.join(timeout=2)
    for t in threads:
        t.join(timeout=0.2)

    elapsed = max(1e-6, time.time() - test_start)
    completed = state.completed
    success = state.success_2xx
    success_rate = (success / completed * 100.0) if completed else 0.0
    achieved_rps = completed / elapsed

    lat = sorted(r.latency_ms for r in state.results)
    avg = (sum(lat) / len(lat)) if lat else float("nan")
    p50 = percentile(lat, 50)
    p90 = percentile(lat, 90)
    p95 = percentile(lat, 95)
    p99 = percentile(lat, 99)
    min_lat = lat[0] if lat else float("nan")
    max_lat = lat[-1] if lat else float("nan")

    print("\n========== LOAD TEST SUMMARY ==========")
    print(f"base_url      : {base_url}")
    print(f"target_rps    : {args.rps}")
    print(f"duration_sec  : {args.duration}")
    print(f"total_planned : {total_planned}")
    print(f"total_sent    : {state.sent}")
    print(f"total_done    : {completed}")
    print(f"success_2xx   : {success}")
    print(f"success_rate  : {success_rate:.2f}%")
    print(f"achieved_rps  : {achieved_rps:.2f}")
    print(f"latency_min   : {min_lat:.2f} ms")
    print(f"latency_avg   : {avg:.2f} ms")
    print(f"latency_p50   : {p50:.2f} ms")
    print(f"latency_p90   : {p90:.2f} ms")
    print(f"latency_p95   : {p95:.2f} ms")
    print(f"latency_p99   : {p99:.2f} ms")
    print(f"latency_max   : {max_lat:.2f} ms")
    print(f"status_counts : {dict(state.status_counter)}")
    print("=======================================")

    csv_path = Path(args.csv) if args.csv else Path("reports") / f"booking_1000rps_{now_ms()}.csv"
    save_csv(state.results, csv_path)
    print(f"[output] csv_saved={csv_path.resolve()}")

    # Return non-zero if success rate drops too much.
    return 0 if success_rate >= 95.0 else 1


if __name__ == "__main__":
    raise SystemExit(main())

