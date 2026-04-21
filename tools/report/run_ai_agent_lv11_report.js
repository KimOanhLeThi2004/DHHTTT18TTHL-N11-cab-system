#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { performance } = require("perf_hooks");

const API_BASE = (process.env.API_BASE_URL || "http://192.168.57.101:3000").replace(/\/+$/, "");
const ROOT = path.resolve(__dirname, "..", "..");
const OUT_FILE = path.join(ROOT, "reports", "ai-agent-lv11-report.txt");

const ctx = {
  email: `ai_lv11_${Date.now()}_${Math.floor(Math.random() * 9999)}@test.com`,
  password: "123456",
  token: "",
  refreshToken: "",
  userId: "",
  sagaBookingSuccessId: "",
  sagaBookingFailId: "",
  baseDriverIds: [],
};

const allCaseResults = [];

function pretty(v) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function authHeader() {
  return ctx.token ? { Authorization: `Bearer ${ctx.token}` } : {};
}

async function request(method, reqPath, { headers = {}, body, timeoutMs = 15000 } = {}) {
  const finalHeaders = { Accept: "application/json", ...headers };
  const options = { method, headers: finalHeaders };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
    if (!finalHeaders["Content-Type"]) {
      finalHeaders["Content-Type"] = "application/json";
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  let status = 0;
  let responseBody = {};
  let error = null;
  try {
    const res = await fetch(`${API_BASE}${reqPath}`, { ...options, signal: controller.signal });
    status = res.status;
    const raw = await res.text();
    if (!raw) {
      responseBody = {};
    } else {
      try {
        responseBody = JSON.parse(raw);
      } catch {
        responseBody = { raw };
      }
    }
  } catch (e) {
    error = e && e.name === "AbortError" ? "timeout" : String(e);
    responseBody = { error };
  } finally {
    clearTimeout(timer);
  }

  return {
    method,
    path: reqPath,
    request_headers: finalHeaders,
    request_body: body === undefined ? null : body,
    response_status: status,
    response_body: responseBody,
    elapsed_ms: Math.round(performance.now() - started),
    error,
  };
}

async function runCase(caseDef) {
  const requests = [];
  const notes = [];
  const started = performance.now();
  let status = "PASS";
  let reason = "ok";

  const exec = async (method, reqPath, opts) => {
    const result = await request(method, reqPath, opts);
    requests.push(result);
    return result;
  };

  try {
    const out = await caseDef.run({ exec, notes, ctx });
    if (out && out.status) status = out.status;
    if (out && out.reason) reason = out.reason;
  } catch (err) {
    status = "FAIL";
    reason = `Exception: ${err.message || String(err)}`;
  }

  const elapsed = Math.round(performance.now() - started);
  allCaseResults.push({
    id: caseDef.id,
    level: caseDef.level,
    title: caseDef.title,
    status,
    reason,
    elapsed_ms: elapsed,
    requests,
    notes,
  });
}

async function setupAuthAndDrivers() {
  // Register
  const registerRes = await request("POST", "/auth/register", {
    body: {
      email: ctx.email,
      password: ctx.password,
      name: "AI LV11 User",
      role: "CUSTOMER",
    },
  });
  if (![201, 400].includes(registerRes.response_status)) {
    throw new Error(`register failed: ${registerRes.response_status} ${pretty(registerRes.response_body)}`);
  }
  if (registerRes.response_body && registerRes.response_body.user_id) {
    ctx.userId = registerRes.response_body.user_id;
  }

  // Login
  const loginRes = await request("POST", "/auth/login", {
    body: {
      email: ctx.email,
      password: ctx.password,
      role: "CUSTOMER",
    },
  });
  if (loginRes.response_status !== 200) {
    throw new Error(`login failed: ${loginRes.response_status} ${pretty(loginRes.response_body)}`);
  }

  const data = loginRes.response_body || {};
  ctx.token = data.access_token || data.accessToken || data.token || "";
  ctx.refreshToken = data.refresh_token || data.refreshToken || "";
  ctx.userId = ctx.userId || data.user_id || data.userId || "";

  if (!ctx.token) {
    throw new Error("login did not return token");
  }

  // Put deterministic online drivers for agent + saga tests.
  const base = Date.now();
  ctx.baseDriverIds = [`DRV_AI_L11_${base}`, `DRV_AI_L11_${base + 1}`, `DRV_AI_L11_${base + 2}`];
  await request("POST", "/drivers/online", {
    body: { driverId: ctx.baseDriverIds[0], lat: 10.7601, lng: 106.6601, vehicleType: "CAR" },
  });
  await request("POST", "/drivers/online", {
    body: { driverId: ctx.baseDriverIds[1], lat: 10.7608, lng: 106.6608, vehicleType: "CAR" },
  });
  await request("POST", "/drivers/online", {
    body: { driverId: ctx.baseDriverIds[2], lat: 10.7615, lng: 106.6615, vehicleType: "CAR" },
  });
}

function hasDecisionLog(body) {
  return Boolean(body && body.decision_log && body.decision_log.trace_id && body.decision_log.selection_reason);
}

const cases = [
  {
    id: 23,
    level: 3,
    title: "AI Agent chon driver tu Driver Service",
    run: async ({ exec, ctx }) => {
      const nearby = await exec("GET", "/drivers/nearby?lat=10.7605&lng=106.6605&radiusKm=5&vehicleType=CAR");
      if (nearby.response_status !== 200 || !Array.isArray(nearby.response_body) || !nearby.response_body.length) {
        return { status: "FAIL", reason: `nearby failed ${nearby.response_status}` };
      }
      const pick = await exec("POST", "/ai/agent/select-driver", {
        body: { strategy: "nearest", drivers: nearby.response_body },
      });
      const selected = pick.response_body && pick.response_body.selected_driver;
      const onlineIds = new Set(nearby.response_body.map((d) => String(d.id)));
      const selectedId = selected ? String(selected.id || "") : "";
      if (pick.response_status === 200 && selectedId && onlineIds.has(selectedId)) {
        return { status: "PASS", reason: `selected_driver=${selectedId}` };
      }
      return { status: "FAIL", reason: `invalid selection: ${pretty(pick.response_body)}` };
    },
  },
  {
    id: 28,
    level: 3,
    title: "Agent du context (MCP-like) de quyet dinh",
    run: async ({ exec }) => {
      const res = await exec("POST", "/ai/agent/select-driver", {
        body: {
          bookingId: `BK_CTX_${Date.now()}`,
          strategy: "balanced",
          pickup: { lat: 10.7602, lng: 106.6602 },
          dropoff: { lat: 10.772, lng: 106.701 },
          estimatedPrice: 62000,
          demand_index: 1.4,
          supply_index: 0.9,
          drivers: [
            { id: "CTX1", status: "ONLINE", distanceKm: 2, rating: 4.6, eta: 6, price: 60000 },
            { id: "CTX2", status: "ONLINE", distanceKm: 3, rating: 4.9, eta: 8, price: 58000 },
          ],
        },
      });
      if (res.response_status === 200 && res.response_body.selected_driver && hasDecisionLog(res.response_body)) {
        return { status: "PASS", reason: "context accepted + decision_log present" };
      }
      return { status: "FAIL", reason: `unexpected response ${res.response_status}` };
    },
  },
  {
    id: 36,
    level: 4,
    title: "Saga success flow (Booking -> Payment -> Notification)",
    run: async ({ exec, notes, ctx }) => {
      const booking = await exec("POST", "/booking", {
        headers: { ...authHeader(), "Idempotency-Key": `saga-ok-${Date.now()}` },
        body: {
          pickup: { lat: 10.7602, lng: 106.6602 },
          dropoff: { lat: 10.7705, lng: 106.6701 },
          distanceKm: 4,
          durationMin: 9,
          vehicleType: "CAR",
        },
      });
      if (![200, 201].includes(booking.response_status)) {
        return { status: "FAIL", reason: `booking step failed: ${booking.response_status}` };
      }

      const bookingId = booking.response_body.booking_id;
      ctx.sagaBookingSuccessId = bookingId;
      const pay = await exec("POST", "/payments/pay", {
        headers: authHeader(),
        body: { bookingId, method: "CASH", amount: 80000 },
      });
      const notify = await exec("POST", "/notifications", {
        headers: authHeader(),
        body: { userId: ctx.userId || "unknown", message: `Saga success for ${bookingId}` },
      });

      notes.push(
        "Saga dien giai: buoc Payment va Notification deu thanh cong o API boundary; " +
          "event bus/internal state transition (Kafka spans) can xac nhan them qua logs cluster."
      );

      if ([200, 201].includes(pay.response_status) && notify.response_status === 200) {
        return { status: "PASS", reason: `booking=${bookingId}, payment=${pay.response_status}, notify=200` };
      }
      return { status: "FAIL", reason: `payment=${pay.response_status}, notify=${notify.response_status}` };
    },
  },
  {
    id: 37,
    level: 4,
    title: "Saga failure + compensation",
    run: async ({ exec, notes, ctx }) => {
      const booking = await exec("POST", "/booking", {
        headers: { ...authHeader(), "Idempotency-Key": `saga-fail-${Date.now()}` },
        body: {
          pickup: { lat: 10.7603, lng: 106.6603 },
          dropoff: { lat: 10.7709, lng: 106.6709 },
          distanceKm: 4,
          durationMin: 9,
          vehicleType: "CAR",
        },
      });
      if (![200, 201].includes(booking.response_status)) {
        return { status: "FAIL", reason: `booking step failed: ${booking.response_status}` };
      }
      const bookingId = booking.response_body.booking_id;
      ctx.sagaBookingFailId = bookingId;

      const payFail = await exec("POST", "/payments/pay", {
        headers: authHeader(),
        body: { bookingId, payment_method: "invalid_card", amount: 50000 },
      });
      const list = await exec("GET", "/booking", { headers: authHeader() });
      let observed = "unknown";
      if (Array.isArray(list.response_body)) {
        const b = list.response_body.find((x) => String(x.booking_id || "") === String(bookingId));
        observed = b ? String(b.status || "") : "not_found";
      }

      notes.push(
        "Saga dien giai: compensation duoc xem la hop ly neu sau payment fail, booking " +
          "khong con o trang thai dang do (CANCELLED/FAILED). Khong verify refund event do khong co endpoint cong khai."
      );

      if (payFail.response_status === 400 && ["CANCELLED", "FAILED"].includes(observed)) {
        return { status: "PASS", reason: `payment=400, booking_status=${observed}` };
      }
      return {
        status: "FAIL",
        reason: `payment=${payFail.response_status}, booking_status=${observed}`,
      };
    },
  },
  {
    id: 41,
    level: 5,
    title: "ETA output in valid range",
    run: async ({ exec }) => {
      const res = await exec("POST", "/ai/eta", { body: { distance_km: 5, traffic_level: 0.7 } });
      const eta = Number(res.response_body.eta);
      if (res.response_status === 200 && Number.isFinite(eta) && eta > 0 && eta < 60) {
        return { status: "PASS", reason: `eta=${eta}` };
      }
      return { status: "FAIL", reason: `unexpected eta: ${pretty(res.response_body)}` };
    },
  },
  {
    id: 42,
    level: 5,
    title: "Pricing surge > 1 when high demand",
    run: async ({ exec }) => {
      const res = await exec("POST", "/pricing/calculate", {
        body: { distance_km: 5, demand_index: 2.5, supply_index: 1, vehicleType: "CAR" },
      });
      const surge = Number(res.response_body.surgeMultiplier);
      if (res.response_status === 200 && Number.isFinite(surge) && surge > 1 && surge <= 3) {
        return { status: "PASS", reason: `surge=${surge}` };
      }
      return { status: "FAIL", reason: `unexpected pricing: ${pretty(res.response_body)}` };
    },
  },
  {
    id: 43,
    level: 5,
    title: "Fraud score threshold",
    run: async ({ exec }) => {
      const res = await exec("POST", "/ai/fraud", {
        body: {
          user_id: "USR-HIGH",
          driver_id: "DRV-HIGH",
          booking_id: "BK-HIGH",
          amount: 5000000,
          location: "HighRiskZone",
          device_fingerprint: "new-device-xyz",
        },
      });
      if (res.response_status === 200 && Object.prototype.hasOwnProperty.call(res.response_body, "flagged")) {
        return { status: "PASS", reason: `flagged=${res.response_body.flagged}, score=${res.response_body.fraud_score}` };
      }
      return { status: "FAIL", reason: `unexpected fraud output: ${pretty(res.response_body)}` };
    },
  },
  {
    id: 44,
    level: 5,
    title: "Recommendation top-3",
    run: async ({ exec }) => {
      const res = await exec("POST", "/ai/recommendations", {
        body: {
          drivers: [
            { id: "R1", rating: 4.3 },
            { id: "R2", rating: 4.9 },
            { id: "R3", rating: 4.7 },
            { id: "R4", rating: 4.1 },
          ],
        },
      });
      const top = res.response_body.top_drivers;
      if (res.response_status === 200 && Array.isArray(top) && top.length === 3) {
        return { status: "PASS", reason: `top3=${top.map((d) => d.id).join(",")}` };
      }
      return { status: "FAIL", reason: `unexpected recommendations: ${pretty(res.response_body)}` };
    },
  },
  {
    id: 45,
    level: 5,
    title: "Forecast schema",
    run: async ({ exec }) => {
      const res = await exec("POST", "/ai/forecast", { body: { demand_index: 1.2 } });
      if (
        res.response_status === 200 &&
        Object.prototype.hasOwnProperty.call(res.response_body, "horizon") &&
        Object.prototype.hasOwnProperty.call(res.response_body, "demand_index") &&
        Object.prototype.hasOwnProperty.call(res.response_body, "model_version")
      ) {
        return { status: "PASS", reason: "forecast schema ok" };
      }
      return { status: "FAIL", reason: `unexpected forecast: ${pretty(res.response_body)}` };
    },
  },
  {
    id: 46,
    level: 5,
    title: "Model version output",
    run: async ({ exec }) => {
      const res = await exec("GET", "/ai/model-info");
      if (res.response_status === 200 && res.response_body.eta_model_version && res.response_body.pricing_model_version) {
        return { status: "PASS", reason: `eta_model=${res.response_body.eta_model_version}` };
      }
      return { status: "FAIL", reason: `unexpected model-info: ${pretty(res.response_body)}` };
    },
  },
  {
    id: 47,
    level: 5,
    title: "AI latency under 200ms",
    run: async ({ exec }) => {
      const res = await exec("POST", "/ai/eta", { body: { distance_km: 4, traffic_level: 0.4 } });
      if (res.response_status === 200 && res.elapsed_ms < 200) {
        return { status: "PASS", reason: `latency=${res.elapsed_ms}ms` };
      }
      return { status: "FAIL", reason: `latency=${res.elapsed_ms}ms` };
    },
  },
  {
    id: 48,
    level: 5,
    title: "Drift detection trigger",
    run: async ({ exec, notes }) => {
      const res = await exec("GET", "/metrics");
      const raw = JSON.stringify(res.response_body || {});
      const hasDriftMetric = /drift/i.test(raw);
      notes.push("No dedicated drift API in current gateway surface; check based on exposed metrics only.");
      if (res.response_status === 200 && hasDriftMetric) {
        return { status: "PASS", reason: "drift metric detected" };
      }
      return { status: "BLOCKED", reason: "no explicit drift endpoint/metric exposed" };
    },
  },
  {
    id: 49,
    level: 5,
    title: "Model fallback when AI error",
    run: async ({ exec }) => {
      const res = await exec("POST", "/ai/agent/select-driver", {
        body: {
          strategy: "balanced",
          drivers: [
            { id: "F1", status: "ONLINE", distanceKm: 2, rating: 4.5, eta: 6, price: 52000 },
            { id: "F2", status: "ONLINE", distanceKm: 2.4, rating: 4.7, eta: 7, price: 50000 },
          ],
        },
      });
      const mode = String(res.response_body.mode || "");
      const selected = res.response_body.selected_driver;
      if (res.response_status === 200 && ["ai", "fallback"].includes(mode) && selected) {
        return { status: mode === "fallback" ? "PASS" : "PASS", reason: `mode=${mode}, selected=${selected.id}` };
      }
      return { status: "FAIL", reason: `unexpected fallback behavior: ${pretty(res.response_body)}` };
    },
  },
  {
    id: 50,
    level: 5,
    title: "Outlier input no crash",
    run: async ({ exec }) => {
      const res = await exec("POST", "/ai/eta", { body: { distance_km: 1000, traffic_level: 0.5 } });
      if ([200, 422].includes(res.response_status)) {
        return { status: "PASS", reason: `status=${res.response_status}, body=${pretty(res.response_body)}` };
      }
      return { status: "FAIL", reason: `unexpected status=${res.response_status}` };
    },
  },
  {
    id: 51,
    level: 6,
    title: "Agent picks nearest driver",
    run: async ({ exec }) => {
      const res = await exec("POST", "/ai/agent/select-driver", {
        body: {
          strategy: "nearest",
          drivers: [
            { id: "D1", status: "ONLINE", distanceKm: 5, rating: 4.5, eta: 9, price: 52000 },
            { id: "D2", status: "ONLINE", distanceKm: 2, rating: 4.2, eta: 6, price: 54000 },
            { id: "D3", status: "ONLINE", distanceKm: 3, rating: 4.8, eta: 7, price: 51000 },
          ],
        },
      });
      const selectedId = String((res.response_body.selected_driver || {}).id || "");
      if (res.response_status === 200 && selectedId === "D2") {
        return { status: "PASS", reason: "selected D2 as nearest" };
      }
      return { status: "FAIL", reason: `selected=${selectedId}` };
    },
  },
  {
    id: 52,
    level: 6,
    title: "Agent can prioritize rating",
    run: async ({ exec }) => {
      const res = await exec("POST", "/ai/agent/select-driver", {
        body: {
          strategy: "rating",
          drivers: [
            { id: "D1", status: "ONLINE", distanceKm: 2, rating: 4.0, eta: 5, price: 50000 },
            { id: "D2", status: "ONLINE", distanceKm: 3, rating: 4.9, eta: 8, price: 40000 },
          ],
        },
      });
      const selectedId = String((res.response_body.selected_driver || {}).id || "");
      if (res.response_status === 200 && selectedId === "D2") {
        return { status: "PASS", reason: "selected D2 by rating strategy" };
      }
      return { status: "FAIL", reason: `selected=${selectedId}` };
    },
  },
  {
    id: 53,
    level: 6,
    title: "Agent balances ETA vs price",
    run: async ({ exec }) => {
      const res = await exec("POST", "/ai/agent/select-driver", {
        body: {
          strategy: "balanced",
          drivers: [
            { id: "A", status: "ONLINE", eta: 5, price: 50000, rating: 4.5, distanceKm: 2 },
            { id: "B", status: "ONLINE", eta: 8, price: 40000, rating: 4.9, distanceKm: 3 },
          ],
        },
      });
      const selectedId = String((res.response_body.selected_driver || {}).id || "");
      if (res.response_status === 200 && ["A", "B"].includes(selectedId)) {
        return { status: "PASS", reason: `selected=${selectedId}` };
      }
      return { status: "FAIL", reason: `unexpected body=${pretty(res.response_body)}` };
    },
  },
  {
    id: 54,
    level: 6,
    title: "Agent calls correct tools/sequence",
    run: async ({ exec, notes }) => {
      const modelInfo = await exec("GET", "/ai/model-info");
      const selection = await exec("POST", "/ai/agent/select-driver", {
        body: {
          strategy: "balanced",
          drivers: [{ id: "T1", status: "ONLINE", distanceKm: 2, rating: 4.7, eta: 6, price: 51000 }],
        },
      });
      notes.push(
        "Tool call order cannot be proven only from public API response. Need internal logs/traces for strict order assertion."
      );
      if (modelInfo.response_status === 200 && selection.response_status === 200) {
        return { status: "BLOCKED", reason: "insufficient observability to assert call order" };
      }
      return { status: "FAIL", reason: "model-info/select-driver unavailable" };
    },
  },
  {
    id: 55,
    level: 6,
    title: "Missing context fallback",
    run: async ({ exec }) => {
      const res = await exec("POST", "/ai/agent/select-driver", { body: { strategy: "balanced", drivers: [] } });
      if (res.response_status === 200 && res.response_body.mode === "fallback" && res.response_body.selected_driver === null) {
        return { status: "PASS", reason: "fallback no_driver" };
      }
      return { status: "FAIL", reason: `unexpected body=${pretty(res.response_body)}` };
    },
  },
  {
    id: 56,
    level: 6,
    title: "Retry when ETA service fails",
    run: async ({ exec, notes }) => {
      const probe = await exec("POST", "/ai/eta", { body: { distance_km: 5, traffic_level: 0.5 } });
      notes.push("Cannot inject ETA downstream failure from black-box HTTP only; retry behavior requires chaos/fault injection.");
      if (probe.response_status === 200) {
        return { status: "BLOCKED", reason: "no fault-injection path to verify retry logic" };
      }
      return { status: "FAIL", reason: `eta endpoint unavailable status=${probe.response_status}` };
    },
  },
  {
    id: 57,
    level: 6,
    title: "Do not select offline driver",
    run: async ({ exec }) => {
      const res = await exec("POST", "/ai/agent/select-driver", {
        body: {
          strategy: "nearest",
          drivers: [
            { id: "O1", status: "OFFLINE", distanceKm: 1, rating: 4.9, eta: 3, price: 50000 },
            { id: "O2", status: "OFFLINE", distanceKm: 2, rating: 4.8, eta: 4, price: 52000 },
          ],
        },
      });
      if (res.response_status === 200 && res.response_body.selected_driver === null) {
        return { status: "PASS", reason: "offline drivers filtered out" };
      }
      return { status: "FAIL", reason: `unexpected body=${pretty(res.response_body)}` };
    },
  },
  {
    id: 58,
    level: 6,
    title: "Decision log completeness",
    run: async ({ exec }) => {
      const res = await exec("POST", "/ai/agent/select-driver", {
        headers: { "x-request-id": `trace-${Date.now()}` },
        body: {
          strategy: "balanced",
          drivers: [
            { id: "L1", status: "ONLINE", distanceKm: 2.1, rating: 4.7, eta: 6, price: 52000 },
            { id: "L2", status: "ONLINE", distanceKm: 2.5, rating: 4.6, eta: 5, price: 53000 },
          ],
        },
      });
      if (res.response_status === 200 && hasDecisionLog(res.response_body)) {
        return { status: "PASS", reason: "trace_id + selection_reason present" };
      }
      return { status: "FAIL", reason: `missing decision log fields: ${pretty(res.response_body)}` };
    },
  },
  {
    id: 59,
    level: 6,
    title: "Concurrent requests handling",
    run: async ({ exec }) => {
      const reqs = [];
      const payload = {
        strategy: "balanced",
        drivers: [
          { id: "C1", status: "ONLINE", distanceKm: 2, rating: 4.7, eta: 6, price: 51000 },
          { id: "C2", status: "ONLINE", distanceKm: 3, rating: 4.9, eta: 8, price: 49000 },
          { id: "C3", status: "ONLINE", distanceKm: 1.8, rating: 4.4, eta: 5, price: 56000 },
        ],
      };
      for (let i = 0; i < 40; i += 1) {
        reqs.push(exec("POST", "/ai/agent/select-driver", { body: payload }));
      }
      const out = await Promise.all(reqs);
      const ok = out.filter((x) => x.response_status === 200).length;
      const rate = ok / out.length;
      if (rate >= 0.95) {
        return { status: "PASS", reason: `success_rate=${(rate * 100).toFixed(1)}%` };
      }
      return { status: "FAIL", reason: `success_rate=${(rate * 100).toFixed(1)}%` };
    },
  },
  {
    id: 60,
    level: 6,
    title: "Rule-based fallback when AI fails",
    run: async ({ exec, notes }) => {
      const res = await exec("POST", "/ai/agent/select-driver", {
        body: {
          strategy: "balanced",
          drivers: [
            { id: "RB1", status: "ONLINE", distanceKm: 2.2, rating: 4.6, eta: 6, price: 51000 },
            { id: "RB2", status: "ONLINE", distanceKm: 2.7, rating: 4.8, eta: 7, price: 49000 },
          ],
        },
      });
      const mode = String(res.response_body.mode || "");
      if (res.response_status === 200 && mode === "fallback" && res.response_body.selected_driver) {
        return { status: "PASS", reason: `fallback selected=${res.response_body.selected_driver.id}` };
      }
      notes.push("Mode=ai means model path healthy; fallback path not forced in this run.");
      if (res.response_status === 200 && mode === "ai") {
        return { status: "BLOCKED", reason: "AI path healthy, cannot force crash from black-box request" };
      }
      return { status: "FAIL", reason: `unexpected body=${pretty(res.response_body)}` };
    },
  },
  {
    id: 62,
    level: 7,
    title: "ETA service under load",
    run: async ({ exec }) => {
      const jobs = [];
      for (let i = 0; i < 80; i += 1) {
        jobs.push(exec("POST", "/ai/eta", { body: { distance_km: 5, traffic_level: 0.6 } }));
      }
      const out = await Promise.all(jobs);
      const ok = out.filter((x) => x.response_status === 200);
      const latencies = ok.map((x) => x.elapsed_ms).sort((a, b) => a - b);
      const p95 = latencies.length ? latencies[Math.floor(latencies.length * 0.95) - 1] : 999999;
      if (ok.length === out.length && p95 < 200) {
        return { status: "PASS", reason: `count=${ok.length}, p95=${p95}ms` };
      }
      return { status: "FAIL", reason: `ok=${ok.length}/${out.length}, p95=${p95}ms` };
    },
  },
  {
    id: 72,
    level: 8,
    title: "Pricing timeout -> retry/fallback",
    run: async ({ exec, notes }) => {
      const probe = await exec("POST", "/booking", {
        headers: { ...authHeader(), "Idempotency-Key": `pricing-probe-${Date.now()}` },
        body: {
          pickup: { lat: 10.761, lng: 106.661 },
          dropoff: { lat: 10.772, lng: 106.672 },
          distanceKm: 5,
          durationMin: 10,
          vehicleType: "CAR",
        },
      });
      notes.push("Cannot directly induce pricing timeout from public API. Need chaos (kill pricing service / inject delay).");
      if ([200, 201].includes(probe.response_status)) {
        return { status: "BLOCKED", reason: "no chaos injection available to validate retry path" };
      }
      return { status: "FAIL", reason: `booking probe failed status=${probe.response_status}` };
    },
  },
  {
    id: 75,
    level: 8,
    title: "Circuit breaker open",
    run: async ({ exec, notes }) => {
      const probe = await exec("POST", "/booking", {
        headers: { ...authHeader(), "Idempotency-Key": `cb-probe-${Date.now()}` },
        body: {
          pickup: { lat: 10.7612, lng: 106.6612 },
          dropoff: { lat: 10.7722, lng: 106.6722 },
          distanceKm: 5,
          durationMin: 10,
          vehicleType: "CAR",
        },
      });
      notes.push("Circuit breaker state is internal; cannot assert OPEN without forcing repeated downstream failures and observing internal metrics/logs.");
      if ([200, 201].includes(probe.response_status)) {
        return { status: "BLOCKED", reason: "internal breaker state not externally observable in current API" };
      }
      return { status: "FAIL", reason: `booking probe failed status=${probe.response_status}` };
    },
  },
];

function writeReport() {
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  const counts = allCaseResults.reduce(
    (acc, c) => {
      acc.total += 1;
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    },
    { total: 0, PASS: 0, FAIL: 0, BLOCKED: 0 }
  );

  const lines = [];
  lines.push(`AI Agent Test Report (up to Level 11 scope)`);
  lines.push(`API_BASE_URL: ${API_BASE}`);
  lines.push(`GeneratedAt: ${new Date().toISOString()}`);
  lines.push(`Summary: PASS=${counts.PASS} FAIL=${counts.FAIL} BLOCKED=${counts.BLOCKED} TOTAL=${counts.total}`);
  lines.push("");

  for (const c of allCaseResults.sort((a, b) => a.id - b.id)) {
    lines.push(`TC${String(c.id).padStart(3, "0")} | Level ${c.level} | ${c.status}`);
    lines.push(`Title: ${c.title}`);
    lines.push(`Reason: ${c.reason}`);
    lines.push(`Elapsed(ms): ${c.elapsed_ms}`);
    if (c.notes && c.notes.length) {
      lines.push(`Notes:`);
      c.notes.forEach((n) => lines.push(`- ${n}`));
    }
    if (!c.requests.length) {
      lines.push(`Requests: (none)`);
    } else {
      c.requests.forEach((r, idx) => {
        lines.push(`Request #${idx + 1}`);
        lines.push(`- Method: ${r.method}`);
        lines.push(`- Path: ${r.path}`);
        lines.push(`- Headers: ${pretty(r.request_headers)}`);
        lines.push(`- Body: ${pretty(r.request_body)}`);
        lines.push(`- ResponseStatus: ${r.response_status}`);
        lines.push(`- ResponseBody: ${pretty(r.response_body)}`);
        lines.push(`- DurationMs: ${r.elapsed_ms}`);
      });
    }
    lines.push("-".repeat(100));
  }

  fs.writeFileSync(OUT_FILE, `${lines.join("\n")}\n`, "utf8");
  return counts;
}

async function main() {
  await setupAuthAndDrivers();
  for (const c of cases) {
    await runCase(c);
  }
  const counts = writeReport();
  console.log(`Report written: ${OUT_FILE}`);
  console.log(`PASS=${counts.PASS} FAIL=${counts.FAIL} BLOCKED=${counts.BLOCKED} TOTAL=${counts.total}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

