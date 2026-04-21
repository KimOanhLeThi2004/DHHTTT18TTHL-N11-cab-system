#!/usr/bin/env python3
"""
Load test ETA endpoint with target RPS and correctness validation.

Goal:
- Simulate high load (default 500 req/s)
- Verify ETA response correctness
- Verify latency SLA (default p95 < 200ms)
- Verify no timeout
"""

import argparse
import csv
import json
import math
import queue
import random
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


def calc_eta_expected(distance_km: float, traffic_level: float) -> int:
    d = max(0.0, float(distance_km))
    t = max(0.0, float(traffic_level))
    if d == 0:
        return 0
    speed = max(10.0, 30.0 - t * 15.0)
    return max(1, int(round((d / speed) * 60.0)))


def http_json(
    method: str,
    url: str,
    body: Optional[dict] = None,
    headers: Optional[Dict[str, str]] = None,
    timeout: float = 2.0,
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
    distance_km: float
    traffic_level: float
    expected_eta: int
    actual_eta: Optional[int]
    eta_correct: bool
    timeout: bool
    error: str


class SharedState:
    def __init__(self, total_planned: int):
        self.total_planned = total_planned
        self.sent = 0
        self.completed = 0
        self.success_2xx = 0
        self.timeouts = 0
        self.eta_correct = 0
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
            if result.timeout:
                self.timeouts += 1
            if result.eta_correct:
                self.eta_correct += 1
            self.status_counter[result.status] += 1
            self.results.append(result)


def parse_eta(payload: dict) -> Optional[int]:
    val = payload.get("eta")
    if val is None:
        return None
    try:
        num = float(val)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(num):
        return None
    return int(round(num))


def build_eta_body() -> Tuple[dict, float, float, int]:
    distance_km = round(random.uniform(0.0, 25.0), 2)
    traffic_level = round(random.uniform(0.0, 1.0), 2)
    expected = calc_eta_expected(distance_km, traffic_level)
    body = {"distance_km": distance_km, "traffic_level": traffic_level}
    return body, distance_km, traffic_level, expected


def worker(
    q: "queue.Queue[Tuple[int, dict, float, float, int]]",
    state: SharedState,
    url: str,
    timeout_sec: float,
) -> None:
    while not state.stop_signal:
        try:
            request_id, body, distance_km, traffic_level, expected_eta = q.get(timeout=0.2)
        except queue.Empty:
            if state.completed >= state.total_planned:
                return
            continue

        state.on_sent()
        t0 = time.perf_counter()
        status, payload = http_json("POST", url, body=body, timeout=timeout_sec)
        latency_ms = (time.perf_counter() - t0) * 1000.0

        actual_eta = parse_eta(payload) if status == 200 else None
        eta_correct = status == 200 and actual_eta is not None and actual_eta == expected_eta
        err = ""
        timeout = False
        if status == 0:
            err = str(payload.get("error", "network_error"))
            lower = err.lower()
            timeout = "timed out" in lower or "timeout" in lower

        state.on_completed(
            ReqResult(
                request_id=request_id,
                status=status,
                latency_ms=latency_ms,
                distance_km=distance_km,
                traffic_level=traffic_level,
                expected_eta=expected_eta,
                actual_eta=actual_eta,
                eta_correct=eta_correct,
                timeout=timeout,
                error=err,
            )
        )
        q.task_done()


def progress_printer(state: SharedState, interval_sec: float = 1.0) -> None:
    last_completed = 0
    while not state.stop_signal:
        time.sleep(interval_sec)
        with state.lock:
            completed = state.completed
            sent = state.sent
            success = state.success_2xx
            eta_correct = state.eta_correct
            timeouts = state.timeouts
            status_snapshot = dict(state.status_counter)
        delta = completed - last_completed
        last_completed = completed
        elapsed = max(1e-6, time.time() - state.start_ts)
        achieved_rps = completed / elapsed
        success_rate = (success / completed * 100.0) if completed else 0.0
        eta_correct_rate = (eta_correct / completed * 100.0) if completed else 0.0
        print(
            f"[progress] sent={sent} completed={completed}/{state.total_planned} "
            f"delta={delta}/s achieved_rps={achieved_rps:.1f} "
            f"success_rate={success_rate:.2f}% eta_correct={eta_correct_rate:.2f}% "
            f"timeouts={timeouts} statuses={status_snapshot}"
        )
        if completed >= state.total_planned:
            return


def save_csv(results: List[ReqResult], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(
            [
                "request_id",
                "status",
                "latency_ms",
                "distance_km",
                "traffic_level",
                "expected_eta",
                "actual_eta",
                "eta_correct",
                "timeout",
                "error",
            ]
        )
        for r in results:
            writer.writerow(
                [
                    r.request_id,
                    r.status,
                    f"{r.latency_ms:.3f}",
                    r.distance_km,
                    r.traffic_level,
                    r.expected_eta,
                    "" if r.actual_eta is None else r.actual_eta,
                    r.eta_correct,
                    r.timeout,
                    r.error,
                ]
            )


def main() -> int:
    parser = argparse.ArgumentParser(description="Load test ETA service under 500 req/s")
    parser.add_argument("--base-url", default="http://192.168.57.101:3000", help="Gateway base URL")
    parser.add_argument("--endpoint", default="/ai/eta", help="ETA endpoint path")
    parser.add_argument("--rps", type=int, default=500, help="Target requests per second")
    parser.add_argument("--duration", type=int, default=30, help="Test duration in seconds")
    parser.add_argument("--workers", type=int, default=300, help="Worker threads")
    parser.add_argument("--timeout", type=float, default=2.0, help="Per-request timeout seconds")
    parser.add_argument("--sla-ms", type=float, default=200.0, help="Latency SLA for p95 (ms)")
    parser.add_argument("--csv", default="", help="CSV output path")
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")
    endpoint = args.endpoint if args.endpoint.startswith("/") else f"/{args.endpoint}"
    url = f"{base_url}{endpoint}"

    total_planned = args.rps * args.duration
    if total_planned <= 0:
        raise SystemExit("rps * duration must be > 0")

    q: "queue.Queue[Tuple[int, dict, float, float, int]]" = queue.Queue(
        maxsize=max(10000, total_planned)
    )
    state = SharedState(total_planned=total_planned)

    workers: List[threading.Thread] = []
    for _ in range(args.workers):
        t = threading.Thread(target=worker, args=(q, state, url, args.timeout), daemon=True)
        t.start()
        workers.append(t)

    prog = threading.Thread(target=progress_printer, args=(state, 1.0), daemon=True)
    prog.start()

    print(
        f"[start] url={url} target={args.rps} req/s duration={args.duration}s "
        f"total={total_planned} workers={args.workers} timeout={args.timeout}s sla_p95<{args.sla_ms}ms"
    )

    request_id = 0
    test_start = time.time()

    for sec in range(args.duration):
        sec_start = test_start + sec
        for _ in range(args.rps):
            request_id += 1
            body, distance_km, traffic_level, expected_eta = build_eta_body()
            q.put((request_id, body, distance_km, traffic_level, expected_eta))

        sleep_until = sec_start + 1.0
        remain = sleep_until - time.time()
        if remain > 0:
            time.sleep(remain)

    q.join()
    state.stop_signal = True
    prog.join(timeout=2)
    for t in workers:
        t.join(timeout=0.2)

    elapsed = max(1e-6, time.time() - test_start)
    completed = state.completed
    success = state.success_2xx
    eta_correct_count = state.eta_correct
    timeouts = state.timeouts

    success_rate = (success / completed * 100.0) if completed else 0.0
    eta_correct_rate = (eta_correct_count / completed * 100.0) if completed else 0.0
    achieved_rps = completed / elapsed

    lat = sorted(r.latency_ms for r in state.results)
    avg = (sum(lat) / len(lat)) if lat else float("nan")
    p50 = percentile(lat, 50)
    p90 = percentile(lat, 90)
    p95 = percentile(lat, 95)
    p99 = percentile(lat, 99)
    min_lat = lat[0] if lat else float("nan")
    max_lat = lat[-1] if lat else float("nan")

    passed_sla = p95 < args.sla_ms if math.isfinite(p95) else False
    passed_timeout = timeouts == 0
    passed_eta = eta_correct_count == completed and completed > 0
    overall_pass = passed_sla and passed_timeout and passed_eta

    print("\n========== ETA LOAD TEST SUMMARY ==========")
    print(f"url             : {url}")
    print(f"target_rps      : {args.rps}")
    print(f"duration_sec    : {args.duration}")
    print(f"total_planned   : {total_planned}")
    print(f"total_sent      : {state.sent}")
    print(f"total_done      : {completed}")
    print(f"success_2xx     : {success}")
    print(f"success_rate    : {success_rate:.2f}%")
    print(f"eta_correct     : {eta_correct_count}/{completed} ({eta_correct_rate:.2f}%)")
    print(f"timeouts        : {timeouts}")
    print(f"achieved_rps    : {achieved_rps:.2f}")
    print(f"latency_min_ms  : {min_lat:.2f}")
    print(f"latency_avg_ms  : {avg:.2f}")
    print(f"latency_p50_ms  : {p50:.2f}")
    print(f"latency_p90_ms  : {p90:.2f}")
    print(f"latency_p95_ms  : {p95:.2f}")
    print(f"latency_p99_ms  : {p99:.2f}")
    print(f"latency_max_ms  : {max_lat:.2f}")
    print(f"status_counts   : {dict(state.status_counter)}")
    print(f"check_sla_p95   : {'PASS' if passed_sla else 'FAIL'} (p95 < {args.sla_ms}ms)")
    print(f"check_timeout   : {'PASS' if passed_timeout else 'FAIL'} (timeouts == 0)")
    print(f"check_eta_value : {'PASS' if passed_eta else 'FAIL'} (all responses correct)")
    print(f"OVERALL         : {'PASS' if overall_pass else 'FAIL'}")
    print("==========================================")

    csv_path = Path(args.csv) if args.csv else Path("reports") / f"eta_500rps_{now_ms()}.csv"
    save_csv(state.results, csv_path)
    print(f"[output] csv_saved={csv_path.resolve()}")

    return 0 if overall_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())
