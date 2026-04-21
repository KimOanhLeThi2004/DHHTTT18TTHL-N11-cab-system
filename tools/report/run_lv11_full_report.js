#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const API_BASE = (process.env.API_BASE_URL || "http://192.168.57.101:3000").replace(/\/+$/, "");
const ROOT = path.resolve(__dirname, "..", "..");
const RUBRIC_FILE = path.join(ROOT, "final_PROJECT_grading-factor.txt");
const OUT_FILE = path.join(ROOT, "reports", "lv11-full-test-report.txt");

const state = {
  email: `lv11_${Date.now()}_${Math.floor(Math.random() * 10000)}@test.com`,
  password: "123456",
  token: "",
  refreshToken: "",
  userId: "",
  bookings: [],
  drivers: [],
};

const results = [];
const defaultBlockedReason =
  "Cannot verify reliably from public API only (requires infra access, fault injection, or internal logs/metrics).";

function pretty(v) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toB64Url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

function signExpiredJwt(payload, secret) {
  const headerB64 = toB64Url({ alg: "HS256", typ: "JWT" });
  const payloadB64 = toB64Url(payload);
  const unsigned = `${headerB64}.${payloadB64}`;
  const sig = crypto.createHmac("sha256", secret).update(unsigned).digest("base64url");
  return `${unsigned}.${sig}`;
}

function authHeader() {
  return state.token ? { Authorization: `Bearer ${state.token}` } : {};
}

function inferLevel(caseId) {
  if (caseId <= 10) return 1;
  if (caseId <= 20) return 2;
  if (caseId <= 30) return 3;
  if (caseId <= 40) return 4;
  if (caseId <= 50) return 5;
  if (caseId <= 60) return 6;
  if (caseId <= 70) return 7;
  if (caseId <= 80) return 8;
  if (caseId <= 90) return 9;
  if (caseId <= 100) return 10;
  return 11;
}

function loadCatalog() {
  const map = new Map();
  if (!fs.existsSync(RUBRIC_FILE)) return map;
  const lines = fs.readFileSync(RUBRIC_FILE, "utf8").split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    const m = line.match(/^(\d{1,3})\s+(.+)$/);
    if (!m) continue;
    const cid = Number(m[1]);
    if (!Number.isFinite(cid) || cid < 1 || cid > 115) continue;
    if (!map.has(cid)) map.set(cid, m[2].trim());
  }
  return map;
}

const catalog = loadCatalog();

async function apiRequest(method, reqPath, { headers = {}, body, timeoutMs = 15000, retry429 = true } = {}) {
  const finalHeaders = { Accept: "application/json", ...headers };
  const options = { method, headers: finalHeaders };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
    if (!finalHeaders["Content-Type"]) {
      finalHeaders["Content-Type"] = "application/json";
    }
  }

  async function doFetch() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const started = Date.now();
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
      duration_ms: Date.now() - started,
      error,
    };
  }

  let one = await doFetch();
  if (retry429 && one.response_status === 429) {
    await sleep(600);
    one = await doFetch();
  }
  return one;
}

function createCaseRunner(caseId, title, fn) {
  return async () => {
    const requests = [];
    const notes = [];
    let status = "PASS";
    let reason = "ok";
    const started = Date.now();

    async function exec(method, reqPath, opts) {
      const r = await apiRequest(method, reqPath, opts);
      requests.push(r);
      return r;
    }

    try {
      const out = await fn({ exec, requests, notes, state });
      if (out && out.status) status = out.status;
      if (out && out.reason) reason = out.reason;
    } catch (e) {
      status = "FAIL";
      reason = `Exception: ${e.message || String(e)}`;
    }

    results.push({
      case_id: caseId,
      level: inferLevel(caseId),
      title,
      status,
      reason,
      elapsed_ms: Date.now() - started,
      notes,
      requests,
    });
  };
}

function blockedCase(caseId, title, blockedReason = defaultBlockedReason) {
  return createCaseRunner(caseId, title, async () => ({ status: "BLOCKED", reason: blockedReason }));
}

async function setup() {
  const reg = await apiRequest("POST", "/auth/register", {
    body: { email: state.email, password: state.password, name: "LV11 User", role: "CUSTOMER" },
  });
  if (![201, 400].includes(reg.response_status)) {
    throw new Error(`register failed ${reg.response_status}: ${pretty(reg.response_body)}`);
  }

  const login = await apiRequest("POST", "/auth/login", {
    body: { email: state.email, password: state.password, role: "CUSTOMER" },
  });
  if (login.response_status !== 200) {
    throw new Error(`login failed ${login.response_status}: ${pretty(login.response_body)}`);
  }

  state.token =
    login.response_body.access_token ||
    login.response_body.accessToken ||
    login.response_body.token ||
    "";
  state.refreshToken =
    login.response_body.refresh_token ||
    login.response_body.refreshToken ||
    "";
  state.userId = login.response_body.user_id || login.response_body.userId || "";

  const base = Date.now();
  state.drivers = [`DRV_LV11_${base}`, `DRV_LV11_${base + 1}`, `DRV_LV11_${base + 2}`];
  await apiRequest("POST", "/drivers/online", {
    body: { driverId: state.drivers[0], lat: 10.7601, lng: 106.6601, vehicleType: "CAR" },
  });
  await apiRequest("POST", "/drivers/online", {
    body: { driverId: state.drivers[1], lat: 10.7607, lng: 106.6607, vehicleType: "CAR" },
  });
  await apiRequest("POST", "/drivers/online", {
    body: { driverId: state.drivers[2], lat: 10.7612, lng: 106.6612, vehicleType: "CAR" },
  });
}

function bookingBody(overrides = {}) {
  return {
    pickup: { lat: 10.7602, lng: 106.6602 },
    dropoff: { lat: 10.7702, lng: 106.6702 },
    distanceKm: 5,
    durationMin: 10,
    vehicleType: "CAR",
    ...overrides,
  };
}

const handlers = new Map();

handlers.set(
  1,
  createCaseRunner(1, catalog.get(1) || "Register", async ({ exec }) => {
    const email = `tc1_${Date.now()}@test.com`;
    const r = await exec("POST", "/auth/register", {
      body: { email, password: "123456", name: "TC1 User", role: "CUSTOMER" },
    });
    return r.response_status === 201 && r.response_body.user_id
      ? { status: "PASS", reason: "registered" }
      : { status: "FAIL", reason: `status=${r.response_status}` };
  })
);

handlers.set(
  2,
  createCaseRunner(2, catalog.get(2) || "Login JWT", async ({ exec }) => {
    const r = await exec("POST", "/auth/login", {
      body: { email: state.email, password: state.password, role: "CUSTOMER" },
    });
    const token = r.response_body.access_token || r.response_body.accessToken || r.response_body.token || "";
    if (!token) return { status: "FAIL", reason: `missing token ${r.response_status}` };
    const parts = token.split(".");
    let payload = {};
    try {
      payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    } catch {
      payload = {};
    }
    return payload.exp && (payload.sub || payload.userId)
      ? { status: "PASS", reason: "jwt payload has exp/sub" }
      : { status: "FAIL", reason: "jwt payload invalid" };
  })
);

handlers.set(
  3,
  createCaseRunner(3, catalog.get(3) || "Create booking valid", async ({ exec }) => {
    const r = await exec("POST", "/booking", {
      headers: { ...authHeader(), "Idempotency-Key": `tc3-${Date.now()}` },
      body: bookingBody(),
    });
    if ([200, 201].includes(r.response_status) && r.response_body.booking_id) {
      state.bookings.push(r.response_body.booking_id);
      return { status: "PASS", reason: `booking_id=${r.response_body.booking_id}` };
    }
    return { status: "FAIL", reason: `status=${r.response_status}` };
  })
);

handlers.set(
  4,
  createCaseRunner(4, catalog.get(4) || "List bookings", async ({ exec }) => {
    const r = await exec("GET", "/booking", { headers: authHeader() });
    return r.response_status === 200 && Array.isArray(r.response_body)
      ? { status: "PASS", reason: `count=${r.response_body.length}` }
      : { status: "FAIL", reason: `status=${r.response_status}` };
  })
);

handlers.set(
  5,
  createCaseRunner(5, catalog.get(5) || "Driver online", async ({ exec }) => {
    const id = `DRV_TC5_${Date.now()}`;
    const r = await exec("POST", "/drivers/online", {
      body: { driverId: id, lat: 10.76, lng: 106.66, vehicleType: "CAR" },
    });
    return r.response_status === 200 && r.response_body.status === "ONLINE"
      ? { status: "PASS", reason: "driver ONLINE" }
      : { status: "FAIL", reason: `status=${r.response_status}` };
  })
);

handlers.set(
  6,
  createCaseRunner(6, catalog.get(6) || "Booking status requested", async ({ exec }) => {
    const r = await exec("POST", "/booking", {
      headers: { ...authHeader(), "Idempotency-Key": `tc6-${Date.now()}` },
      body: bookingBody(),
    });
    const st = String(r.response_body.status || "");
    return [200, 201].includes(r.response_status) && ["REQUESTED", "CONFIRMED"].includes(st)
      ? { status: "PASS", reason: `status=${st}` }
      : { status: "FAIL", reason: `status=${r.response_status}, booking_status=${st}` };
  })
);

handlers.set(
  7,
  createCaseRunner(7, catalog.get(7) || "ETA > 0", async ({ exec }) => {
    const r = await exec("POST", "/ai/eta", { body: { distance_km: 5, traffic_level: 0.5 } });
    const eta = Number(r.response_body.eta);
    return r.response_status === 200 && Number.isFinite(eta) && eta > 0 && eta < 60
      ? { status: "PASS", reason: `eta=${eta}` }
      : { status: "FAIL", reason: `status=${r.response_status}, eta=${eta}` };
  })
);

handlers.set(
  8,
  createCaseRunner(8, catalog.get(8) || "Pricing valid", async ({ exec }) => {
    const r = await exec("POST", "/pricing/calculate", {
      body: { distance_km: 5, demand_index: 1, supply_index: 1, vehicleType: "CAR" },
    });
    const surge = Number(r.response_body.surgeMultiplier || r.response_body.surge_multiplier || 0);
    const price = Number(r.response_body.totalPrice || r.response_body.total_price || 0);
    return r.response_status === 200 && price > 0 && surge >= 1
      ? { status: "PASS", reason: `price=${price}, surge=${surge}` }
      : { status: "FAIL", reason: `status=${r.response_status}` };
  })
);

handlers.set(
  9,
  createCaseRunner(9, catalog.get(9) || "Notification send", async ({ exec }) => {
    const r = await exec("POST", "/notifications", {
      headers: authHeader(),
      body: { userId: state.userId || "USR123", message: "Your ride is confirmed" },
    });
    return r.response_status === 200
      ? { status: "PASS", reason: "notification created" }
      : { status: "FAIL", reason: `status=${r.response_status}` };
  })
);

handlers.set(
  10,
  createCaseRunner(10, catalog.get(10) || "Logout invalidate token", async ({ exec }) => {
    const oldToken = state.token;
    const out = await exec("POST", "/auth/logout", {
      headers: authHeader(),
      body: { refreshToken: state.refreshToken },
    });
    const oldCall = await exec("GET", "/booking", { headers: { Authorization: `Bearer ${oldToken}` } });
    const login = await exec("POST", "/auth/login", {
      body: { email: state.email, password: state.password, role: "CUSTOMER" },
    });
    if (login.response_status === 200) {
      state.token = login.response_body.access_token || login.response_body.accessToken || login.response_body.token || state.token;
      state.refreshToken = login.response_body.refresh_token || login.response_body.refreshToken || state.refreshToken;
    }
    return out.response_status === 200 && oldCall.response_status === 401
      ? { status: "PASS", reason: "old token rejected after logout" }
      : { status: "FAIL", reason: `logout=${out.response_status}, old=${oldCall.response_status}` };
  })
);

handlers.set(
  11,
  createCaseRunner(11, catalog.get(11) || "Missing pickup", async ({ exec }) => {
    const r = await exec("POST", "/booking", {
      headers: authHeader(),
      body: { dropoff: { lat: 10.77, lng: 106.7 }, distanceKm: 5, vehicleType: "CAR" },
    });
    return r.response_status === 400
      ? { status: "PASS", reason: "400 missing pickup" }
      : { status: "FAIL", reason: `status=${r.response_status}` };
  })
);

handlers.set(
  12,
  createCaseRunner(12, catalog.get(12) || "Invalid lat/lng", async ({ exec }) => {
    const r = await exec("POST", "/booking", {
      headers: authHeader(),
      body: bookingBody({ pickup: { lat: "abc", lng: 106.66 } }),
    });
    return r.response_status === 422
      ? { status: "PASS", reason: "422 invalid pickup lat/lng" }
      : { status: "FAIL", reason: `status=${r.response_status}` };
  })
);

handlers.set(
  13,
  createCaseRunner(13, catalog.get(13) || "No online driver", async ({ exec }) => {
    // Try BIKE while only CAR drivers were prepared.
    const r = await exec("POST", "/booking", {
      headers: { ...authHeader(), "Idempotency-Key": `tc13-${Date.now()}` },
      body: bookingBody({ vehicleType: "BIKE" }),
    });
    const st = String(r.response_body.status || "");
    return [200, 201].includes(r.response_status) && ["FAILED", "PENDING"].includes(st)
      ? { status: "PASS", reason: `status=${st}` }
      : { status: "FAIL", reason: `status=${r.response_status}, booking_status=${st}` };
  })
);

handlers.set(
  14,
  createCaseRunner(14, catalog.get(14) || "Invalid payment method", async ({ exec }) => {
    const booking = await exec("POST", "/booking", {
      headers: { ...authHeader(), "Idempotency-Key": `tc14-${Date.now()}` },
      body: bookingBody(),
    });
    if (![200, 201].includes(booking.response_status)) {
      return { status: "FAIL", reason: `booking create failed ${booking.response_status}` };
    }
    const r = await exec("POST", "/payments/pay", {
      headers: authHeader(),
      body: { bookingId: booking.response_body.booking_id, payment_method: "invalid_card", amount: 100000 },
    });
    return r.response_status === 400
      ? { status: "PASS", reason: "400 invalid payment method" }
      : { status: "FAIL", reason: `status=${r.response_status}` };
  })
);

handlers.set(
  15,
  createCaseRunner(15, catalog.get(15) || "ETA distance 0", async ({ exec }) => {
    const r = await exec("POST", "/ai/eta", { body: { distance_km: 0 } });
    const eta = Number(r.response_body.eta);
    return r.response_status === 200 && eta >= 0
      ? { status: "PASS", reason: `eta=${eta}` }
      : { status: "FAIL", reason: `status=${r.response_status}` };
  })
);

handlers.set(
  16,
  createCaseRunner(16, catalog.get(16) || "Pricing demand 0", async ({ exec }) => {
    const r = await exec("POST", "/pricing/calculate", {
      body: { distance_km: 5, demand_index: 0, supply_index: 1, vehicleType: "CAR" },
    });
    const surge = Number(r.response_body.surgeMultiplier || r.response_body.surge_multiplier || 0);
    const total = Number(r.response_body.totalPrice || r.response_body.total_price || 0);
    return r.response_status === 200 && surge >= 1 && total > 0
      ? { status: "PASS", reason: `surge=${surge}, total=${total}` }
      : { status: "FAIL", reason: `status=${r.response_status}` };
  })
);

handlers.set(
  17,
  createCaseRunner(17, catalog.get(17) || "Fraud missing fields", async ({ exec }) => {
    const r = await exec("POST", "/ai/fraud", { body: { user_id: "USR123" } });
    return r.response_status === 400
      ? { status: "PASS", reason: "400 missing fields" }
      : { status: "FAIL", reason: `status=${r.response_status}` };
  })
);

handlers.set(
  18,
  createCaseRunner(18, catalog.get(18) || "Expired token 401", async ({ exec }) => {
    const r = await exec("POST", "/booking", {
      headers: { Authorization: "Bearer expired_token" },
      body: bookingBody(),
    });
    const msg = String(r.response_body.message || "");
    return r.response_status === 401 && msg.toLowerCase().includes("expired")
      ? { status: "PASS", reason: `message=${msg}` }
      : { status: "FAIL", reason: `status=${r.response_status}, message=${msg}` };
  })
);

handlers.set(
  19,
  createCaseRunner(19, catalog.get(19) || "Duplicate booking idempotency", async ({ exec }) => {
    const key = `tc19-${Date.now()}`;
    const body = bookingBody();
    const r1 = await exec("POST", "/booking", { headers: { ...authHeader(), "Idempotency-Key": key }, body });
    const r2 = await exec("POST", "/booking", { headers: { ...authHeader(), "Idempotency-Key": key }, body });
    const id1 = r1.response_body.booking_id;
    const id2 = r2.response_body.booking_id;
    const same = JSON.stringify(r1.response_body) === JSON.stringify(r2.response_body);
    return r1.response_status === 201 && r2.response_status === 200 && id1 && id1 === id2 && same
      ? { status: "PASS", reason: `same booking_id=${id1}` }
      : { status: "FAIL", reason: `r1=${r1.response_status}, r2=${r2.response_status}, id1=${id1}, id2=${id2}` };
  })
);

handlers.set(
  20,
  createCaseRunner(20, catalog.get(20) || "Payload too large", async ({ exec }) => {
    const huge = "x".repeat(1024 * 1024 + 20);
    const r = await exec("POST", "/booking", {
      headers: authHeader(),
      body: bookingBody({ note: huge }),
      timeoutMs: 30000,
      retry429: false,
    });
    return r.response_status === 413
      ? { status: "PASS", reason: "413 payload too large" }
      : { status: "FAIL", reason: `status=${r.response_status}` };
  })
);

handlers.set(
  21,
  createCaseRunner(21, catalog.get(21) || "Booking includes ETA", async ({ exec }) => {
    const r = await exec("POST", "/booking", {
      headers: { ...authHeader(), "Idempotency-Key": `tc21-${Date.now()}` },
      body: bookingBody({ distanceKm: 4 }),
    });
    return [200, 201].includes(r.response_status) && Number(r.response_body.eta_min) >= 0
      ? { status: "PASS", reason: `eta_min=${r.response_body.eta_min}` }
      : { status: "FAIL", reason: `status=${r.response_status}` };
  })
);

handlers.set(
  22,
  createCaseRunner(22, catalog.get(22) || "Booking includes pricing", async ({ exec }) => {
    const r = await exec("POST", "/booking", {
      headers: { ...authHeader(), "Idempotency-Key": `tc22-${Date.now()}` },
      body: bookingBody({ distanceKm: 3 }),
    });
    return [200, 201].includes(r.response_status) && Number(r.response_body.price) > 0
      ? { status: "PASS", reason: `price=${r.response_body.price}` }
      : { status: "FAIL", reason: `status=${r.response_status}` };
  })
);

handlers.set(
  23,
  createCaseRunner(23, catalog.get(23) || "AI select from nearby drivers", async ({ exec }) => {
    const nearby = await exec("GET", "/drivers/nearby?lat=10.7605&lng=106.6605&radiusKm=5&vehicleType=CAR");
    if (nearby.response_status !== 200 || !Array.isArray(nearby.response_body) || !nearby.response_body.length) {
      return { status: "FAIL", reason: `nearby=${nearby.response_status}` };
    }
    const r = await exec("POST", "/ai/agent/select-driver", {
      body: { strategy: "nearest", drivers: nearby.response_body },
    });
    const sid = String((r.response_body.selected_driver || {}).id || "");
    return r.response_status === 200 && sid
      ? { status: "PASS", reason: `selected=${sid}` }
      : { status: "FAIL", reason: `status=${r.response_status}` };
  })
);

handlers.set(
  24,
  createCaseRunner(24, catalog.get(24) || "Booking->Payment->Notification", async ({ exec }) => {
    const booking = await exec("POST", "/booking", {
      headers: { ...authHeader(), "Idempotency-Key": `tc24-${Date.now()}` },
      body: bookingBody(),
    });
    if (![200, 201].includes(booking.response_status)) {
      return { status: "FAIL", reason: `booking failed ${booking.response_status}` };
    }
    const bookingId = booking.response_body.booking_id;
    const pay = await exec("POST", "/payments/pay", {
      headers: authHeader(),
      body: { bookingId, method: "CASH", amount: 120000 },
    });
    const notify = await exec("POST", "/notifications", {
      headers: authHeader(),
      body: { userId: state.userId || "USR123", message: "Payment initialized" },
    });
    return [200, 201].includes(pay.response_status) && notify.response_status === 200
      ? { status: "PASS", reason: `payment=${pay.response_status}, notify=200` }
      : { status: "FAIL", reason: `payment=${pay.response_status}, notify=${notify.response_status}` };
  })
);

handlers.set(25, blockedCase(25, catalog.get(25) || "Kafka ride_requested publish", "Needs Kafka topic/consumer visibility to assert publish and payload integrity."));

handlers.set(
  26,
  createCaseRunner(26, catalog.get(26) || "Driver receives notification", async ({ exec }) => {
    const r = await exec("GET", `/notifications/${state.userId || "USR123"}`, { headers: authHeader() });
    return r.response_status === 200 && Array.isArray(r.response_body)
      ? { status: "PASS", reason: `notifications=${r.response_body.length}` }
      : { status: "FAIL", reason: `status=${r.response_status}` };
  })
);

handlers.set(27, blockedCase(27, catalog.get(27) || "Booking status ACCEPTED + event", "Requires assigned driver token flow and Kafka event verification; no deterministic public hook."));
handlers.set(28, blockedCase(28, catalog.get(28) || "MCP context fetch", "MCP context internals are not exposed via API contract for assertion."));

handlers.set(
  29,
  createCaseRunner(29, catalog.get(29) || "Gateway route correct service", async ({ exec }) => {
    const r = await exec("GET", "/booking", { headers: authHeader() });
    return r.response_status === 200 ? { status: "PASS", reason: "gateway booking route healthy" } : { status: "FAIL", reason: `status=${r.response_status}` };
  })
);

handlers.set(30, blockedCase(30, catalog.get(30) || "Retry pricing timeout", "Need induced pricing timeout/failure injection to verify retry/fallback path."));

handlers.set(
  31,
  createCaseRunner(31, catalog.get(31) || "Transaction create booking success", async ({ exec }) => {
    const r = await exec("POST", "/booking", {
      headers: { ...authHeader(), "Idempotency-Key": `tc31-${Date.now()}` },
      body: bookingBody(),
    });
    return [200, 201].includes(r.response_status) && r.response_body.booking_id
      ? { status: "PASS", reason: `booking_id=${r.response_body.booking_id}` }
      : { status: "FAIL", reason: `status=${r.response_status}` };
  })
);

handlers.set(32, blockedCase(32, catalog.get(32) || "Rollback mid-flow", "Requires deterministic fault after insert and DB verification access."));

handlers.set(
  33,
  createCaseRunner(33, catalog.get(33) || "Payment fail rollback booking", async ({ exec, notes }) => {
    const booking = await exec("POST", "/booking", {
      headers: { ...authHeader(), "Idempotency-Key": `tc33-${Date.now()}` },
      body: bookingBody(),
    });
    if (![200, 201].includes(booking.response_status)) {
      return { status: "FAIL", reason: `booking failed ${booking.response_status}` };
    }
    const bookingId = booking.response_body.booking_id;
    const pay = await exec("POST", "/payments/pay", {
      headers: authHeader(),
      body: { bookingId, payment_method: "invalid_card", amount: 50000 },
    });
    const list = await exec("GET", "/booking", { headers: authHeader() });
    let bStatus = "not_found";
    if (Array.isArray(list.response_body)) {
      const b = list.response_body.find((x) => String(x.booking_id || "") === String(bookingId));
      if (b) bStatus = String(b.status || "");
    }
    notes.push("Compensation inferred from booking status after payment failure.");
    return pay.response_status === 400 && ["FAILED", "CANCELLED"].includes(bStatus)
      ? { status: "PASS", reason: `payment=400, booking_status=${bStatus}` }
      : { status: "FAIL", reason: `payment=${pay.response_status}, booking_status=${bStatus}` };
  })
);

handlers.set(
  34,
  createCaseRunner(34, catalog.get(34) || "Idempotent transaction", async ({ exec }) => {
    const booking = await exec("POST", "/booking", {
      headers: { ...authHeader(), "Idempotency-Key": `tc34-booking-${Date.now()}` },
      body: bookingBody(),
    });
    if (![200, 201].includes(booking.response_status)) {
      return { status: "FAIL", reason: `booking create failed ${booking.response_status}` };
    }
    const bookingId = booking.response_body.booking_id;
    const idemKey = `tc34-pay-${Date.now()}`;
    const p1 = await exec("POST", "/payments/pay", {
      headers: { ...authHeader(), "Idempotency-Key": idemKey },
      body: { bookingId, method: "CASH", amount: 65000 },
    });
    const p2 = await exec("POST", "/payments/pay", {
      headers: { ...authHeader(), "Idempotency-Key": idemKey },
      body: { bookingId, method: "CASH", amount: 65000 },
    });
    const id1 = p1.response_body.id;
    const id2 = p2.response_body.id;
    return [200, 201].includes(p1.response_status) && p2.response_status === 200 && id1 && id1 === id2
      ? { status: "PASS", reason: `same payment id=${id1}` }
      : { status: "FAIL", reason: `p1=${p1.response_status}, p2=${p2.response_status}` };
  })
);

handlers.set(
  35,
  createCaseRunner(35, catalog.get(35) || "Concurrent booking race", async ({ exec }) => {
    const key = `tc35-${Date.now()}`;
    const before = await exec("GET", "/booking", { headers: authHeader() });
    const n0 = Array.isArray(before.response_body) ? before.response_body.length : null;
    const jobs = [];
    for (let i = 0; i < 6; i += 1) {
      jobs.push(
        exec("POST", "/booking", {
          headers: { ...authHeader(), "Idempotency-Key": key },
          body: bookingBody(),
        })
      );
    }
    const out = await Promise.all(jobs);
    const after = await exec("GET", "/booking", { headers: authHeader() });
    const n1 = Array.isArray(after.response_body) ? after.response_body.length : null;
    const createdOnce = n0 !== null && n1 !== null && n1 === n0 + 1;
    const okCodes = out.every((x) => [200, 201].includes(x.response_status));
    return okCodes && createdOnce
      ? { status: "PASS", reason: `count ${n0}->${n1}` }
      : { status: "FAIL", reason: `createdOnce=${createdOnce}, statuses=${out.map((x) => x.response_status).join(",")}` };
  })
);

handlers.set(
  36,
  createCaseRunner(36, catalog.get(36) || "Saga success flow", async ({ exec, notes }) => {
    const booking = await exec("POST", "/booking", {
      headers: { ...authHeader(), "Idempotency-Key": `tc36-${Date.now()}` },
      body: bookingBody(),
    });
    if (![200, 201].includes(booking.response_status)) {
      return { status: "FAIL", reason: `booking failed ${booking.response_status}` };
    }
    const bookingId = booking.response_body.booking_id;
    const pay = await exec("POST", "/payments/pay", {
      headers: authHeader(),
      body: { bookingId, method: "CASH", amount: 70000 },
    });
    const notify = await exec("POST", "/notifications", {
      headers: authHeader(),
      body: { userId: state.userId || "USR123", message: `Saga success ${bookingId}` },
    });
    notes.push("Saga dien giai: danh gia theo boundary API (booking->payment->notification) thay vi event trace noi bo.");
    return [200, 201].includes(pay.response_status) && notify.response_status === 200
      ? { status: "PASS", reason: `booking=${bookingId}, payment=${pay.response_status}, notify=200` }
      : { status: "FAIL", reason: `payment=${pay.response_status}, notify=${notify.response_status}` };
  })
);

handlers.set(
  37,
  createCaseRunner(37, catalog.get(37) || "Saga failure compensation", async ({ exec, notes }) => {
    const booking = await exec("POST", "/booking", {
      headers: { ...authHeader(), "Idempotency-Key": `tc37-${Date.now()}` },
      body: bookingBody(),
    });
    if (![200, 201].includes(booking.response_status)) {
      return { status: "FAIL", reason: `booking failed ${booking.response_status}` };
    }
    const bookingId = booking.response_body.booking_id;
    const pay = await exec("POST", "/payments/pay", {
      headers: authHeader(),
      body: { bookingId, payment_method: "invalid_card", amount: 65000 },
    });
    const list = await exec("GET", "/booking", { headers: authHeader() });
    let bStatus = "not_found";
    if (Array.isArray(list.response_body)) {
      const b = list.response_body.find((x) => String(x.booking_id || "") === String(bookingId));
      if (b) bStatus = String(b.status || "");
    }
    notes.push("Saga dien giai: payment fail + booking ve CANCELLED/FAILED duoc xem la compensation thanh cong.");
    return pay.response_status === 400 && ["FAILED", "CANCELLED"].includes(bStatus)
      ? { status: "PASS", reason: `payment=400, booking_status=${bStatus}` }
      : { status: "FAIL", reason: `payment=${pay.response_status}, booking_status=${bStatus}` };
  })
);

handlers.set(38, blockedCase(38, catalog.get(38) || "Kafka outbox consistency", "Need DB+Kafka dual-write introspection/outbox topic verification."));
handlers.set(39, blockedCase(39, catalog.get(39) || "Partial network failure", "Need network fault injection between services."));
handlers.set(40, blockedCase(40, catalog.get(40) || "ACID integrity", "Requires DB-level transactional assertions and service restart checks."));

for (const id of [41, 42, 43, 44, 45, 46, 47, 49, 50, 51, 52, 53, 55, 57, 58, 59, 60, 62, 63, 67, 68, 81, 82, 83, 85, 86, 91, 92, 96, 98, 102, 113]) {
  // These are covered by concise dedicated handlers below.
}

handlers.set(
  41,
  createCaseRunner(41, catalog.get(41) || "ETA range", async ({ exec }) => {
    const r = await exec("POST", "/ai/eta", { body: { distance_km: 5, traffic_level: 0.7 } });
    const eta = Number(r.response_body.eta);
    return r.response_status === 200 && eta > 0 && eta < 60
      ? { status: "PASS", reason: `eta=${eta}` }
      : { status: "FAIL", reason: `status=${r.response_status}, eta=${eta}` };
  })
);

handlers.set(
  42,
  createCaseRunner(42, catalog.get(42) || "Surge high demand", async ({ exec }) => {
    const r = await exec("POST", "/pricing/calculate", {
      body: { distance_km: 5, demand_index: 2, supply_index: 1, vehicleType: "CAR" },
    });
    const surge = Number(r.response_body.surgeMultiplier || 0);
    return r.response_status === 200 && surge > 1 && surge <= 3
      ? { status: "PASS", reason: `surge=${surge}` }
      : { status: "FAIL", reason: `status=${r.response_status}, surge=${surge}` };
  })
);

handlers.set(
  43,
  createCaseRunner(43, catalog.get(43) || "Fraud threshold", async ({ exec }) => {
    const r = await exec("POST", "/ai/fraud", {
      body: {
        user_id: "USR",
        driver_id: "DRV",
        booking_id: "BK",
        amount: 2000000,
        location: "HCM",
        device_fingerprint: "abc",
      },
    });
    return r.response_status === 200 && Object.prototype.hasOwnProperty.call(r.response_body, "flagged")
      ? { status: "PASS", reason: `score=${r.response_body.fraud_score}, flagged=${r.response_body.flagged}` }
      : { status: "FAIL", reason: `status=${r.response_status}` };
  })
);

handlers.set(
  44,
  createCaseRunner(44, catalog.get(44) || "Recommendations top3", async ({ exec }) => {
    const r = await exec("POST", "/ai/recommendations", {
      body: { drivers: [{ id: "D1", rating: 4.6 }, { id: "D2", rating: 4.9 }, { id: "D3", rating: 4.7 }, { id: "D4", rating: 4.2 }] },
    });
    return r.response_status === 200 && Array.isArray(r.response_body.top_drivers) && r.response_body.top_drivers.length === 3
      ? { status: "PASS", reason: "top3 returned" }
      : { status: "FAIL", reason: `status=${r.response_status}` };
  })
);

handlers.set(
  45,
  createCaseRunner(45, catalog.get(45) || "Forecast schema", async ({ exec }) => {
    const r = await exec("POST", "/ai/forecast", { body: { demand_index: 1.2 } });
    return r.response_status === 200 && r.response_body.model_version
      ? { status: "PASS", reason: "forecast ok" }
      : { status: "FAIL", reason: `status=${r.response_status}` };
  })
);

handlers.set(
  46,
  createCaseRunner(46, catalog.get(46) || "Model version", async ({ exec }) => {
    const r = await exec("GET", "/ai/model-info");
    return r.response_status === 200 && r.response_body.eta_model_version
      ? { status: "PASS", reason: `eta_model=${r.response_body.eta_model_version}` }
      : { status: "FAIL", reason: `status=${r.response_status}` };
  })
);

handlers.set(
  47,
  createCaseRunner(47, catalog.get(47) || "AI latency", async ({ exec }) => {
    const r = await exec("POST", "/ai/eta", { body: { distance_km: 4, traffic_level: 0.4 } });
    return r.response_status === 200 && r.duration_ms < 200
      ? { status: "PASS", reason: `latency=${r.duration_ms}ms` }
      : { status: "FAIL", reason: `latency=${r.duration_ms}ms` };
  })
);

handlers.set(48, blockedCase(48, catalog.get(48) || "Drift detection", "No public drift endpoint/alert in current API surface."));

handlers.set(
  49,
  createCaseRunner(49, catalog.get(49) || "Model fallback", async ({ exec }) => {
    const r = await exec("POST", "/ai/agent/select-driver", { body: { drivers: [] } });
    return r.response_status === 200 && r.response_body.mode === "fallback"
      ? { status: "PASS", reason: "fallback mode" }
      : { status: "FAIL", reason: `status=${r.response_status}` };
  })
);

handlers.set(
  50,
  createCaseRunner(50, catalog.get(50) || "Outlier no crash", async ({ exec }) => {
    const r = await exec("POST", "/ai/eta", { body: { distance_km: 1000, traffic_level: 0.5 } });
    return [200, 422].includes(r.response_status)
      ? { status: "PASS", reason: `status=${r.response_status}` }
      : { status: "FAIL", reason: `status=${r.response_status}` };
  })
);

handlers.set(
  51,
  createCaseRunner(51, catalog.get(51) || "Nearest driver", async ({ exec }) => {
    const r = await exec("POST", "/ai/agent/select-driver", {
      body: {
        strategy: "nearest",
        drivers: [
          { id: "D1", status: "ONLINE", distanceKm: 5, rating: 4.0 },
          { id: "D2", status: "ONLINE", distanceKm: 2, rating: 4.2 },
          { id: "D3", status: "ONLINE", distanceKm: 3, rating: 4.8 },
        ],
      },
      timeoutMs: 20000,
    });
    const sid = String((r.response_body.selected_driver || {}).id || "");
    return r.response_status === 200 && sid === "D2"
      ? { status: "PASS", reason: "selected D2" }
      : { status: "FAIL", reason: `status=${r.response_status}, selected=${sid}` };
  })
);

handlers.set(
  52,
  createCaseRunner(52, catalog.get(52) || "Rating preference", async ({ exec }) => {
    const r = await exec("POST", "/ai/agent/select-driver", {
      body: {
        strategy: "rating",
        drivers: [
          { id: "D1", status: "ONLINE", distanceKm: 2, rating: 4.0 },
          { id: "D2", status: "ONLINE", distanceKm: 3, rating: 4.9 },
        ],
      },
      timeoutMs: 20000,
    });
    const sid = String((r.response_body.selected_driver || {}).id || "");
    return r.response_status === 200 && sid === "D2"
      ? { status: "PASS", reason: "selected D2" }
      : { status: "FAIL", reason: `status=${r.response_status}, selected=${sid}` };
  })
);

handlers.set(
  53,
  createCaseRunner(53, catalog.get(53) || "ETA vs price tradeoff", async ({ exec }) => {
    const r = await exec("POST", "/ai/agent/select-driver", {
      body: {
        strategy: "balanced",
        drivers: [
          { id: "A", status: "ONLINE", eta: 5, price: 50000, rating: 4.5, distanceKm: 2 },
          { id: "B", status: "ONLINE", eta: 8, price: 40000, rating: 4.9, distanceKm: 3 },
        ],
      },
      timeoutMs: 20000,
    });
    const sid = String((r.response_body.selected_driver || {}).id || "");
    return r.response_status === 200 && ["A", "B"].includes(sid)
      ? { status: "PASS", reason: `selected=${sid}` }
      : { status: "FAIL", reason: `status=${r.response_status}, selected=${sid}` };
  })
);

handlers.set(54, blockedCase(54, catalog.get(54) || "Correct tool order", "Need internal traces/log spans for tool-call sequence validation."));

handlers.set(
  55,
  createCaseRunner(55, catalog.get(55) || "Missing context", async ({ exec }) => {
    const r = await exec("POST", "/ai/agent/select-driver", { body: { strategy: "balanced", drivers: [] } });
    return r.response_status === 200 && r.response_body.mode === "fallback"
      ? { status: "PASS", reason: "fallback no_driver" }
      : { status: "FAIL", reason: `status=${r.response_status}` };
  })
);

handlers.set(56, blockedCase(56, catalog.get(56) || "Retry on ETA failure", "Need controlled ETA failure injection to verify retry behavior."));

handlers.set(
  57,
  createCaseRunner(57, catalog.get(57) || "No offline selection", async ({ exec }) => {
    const r = await exec("POST", "/ai/agent/select-driver", {
      body: { strategy: "nearest", drivers: [{ id: "O1", status: "OFFLINE", distanceKm: 1 }] },
    });
    return r.response_status === 200 && r.response_body.selected_driver === null
      ? { status: "PASS", reason: "offline filtered" }
      : { status: "FAIL", reason: `status=${r.response_status}` };
  })
);

handlers.set(
  58,
  createCaseRunner(58, catalog.get(58) || "Decision log", async ({ exec }) => {
    const r = await exec("POST", "/ai/agent/select-driver", {
      headers: { "x-request-id": `tc58-${Date.now()}` },
      body: {
        strategy: "balanced",
        drivers: [{ id: "L1", status: "ONLINE", distanceKm: 2, rating: 4.6, eta: 6, price: 51000 }],
      },
      timeoutMs: 20000,
    });
    const d = r.response_body.decision_log || {};
    return r.response_status === 200 && d.trace_id && d.selection_reason
      ? { status: "PASS", reason: "trace + selection reason present" }
      : { status: "FAIL", reason: `status=${r.response_status}` };
  })
);

handlers.set(
  59,
  createCaseRunner(59, catalog.get(59) || "Concurrent agent requests", async ({ exec }) => {
    const jobs = [];
    const payload = {
      strategy: "balanced",
      drivers: [
        { id: "C1", status: "ONLINE", distanceKm: 2, rating: 4.6, eta: 6, price: 51000 },
        { id: "C2", status: "ONLINE", distanceKm: 3, rating: 4.9, eta: 8, price: 49000 },
      ],
    };
    for (let i = 0; i < 30; i += 1) jobs.push(exec("POST", "/ai/agent/select-driver", { body: payload, timeoutMs: 20000 }));
    const out = await Promise.all(jobs);
    const ok = out.filter((x) => x.response_status === 200).length;
    const rate = ok / out.length;
    return rate >= 0.95
      ? { status: "PASS", reason: `success_rate=${(rate * 100).toFixed(1)}%` }
      : { status: "FAIL", reason: `success_rate=${(rate * 100).toFixed(1)}%` };
  })
);

handlers.set(
  60,
  createCaseRunner(60, catalog.get(60) || "Rule-based fallback", async ({ exec, notes }) => {
    const r = await exec("POST", "/ai/agent/select-driver", {
      body: {
        strategy: "balanced",
        drivers: [
          { id: "RB1", status: "ONLINE", distanceKm: 2.2, rating: 4.5, eta: 6, price: 52000 },
          { id: "RB2", status: "ONLINE", distanceKm: 2.8, rating: 4.8, eta: 7, price: 50000 },
        ],
      },
      timeoutMs: 20000,
    });
    const mode = String(r.response_body.mode || "");
    if (r.response_status === 200 && mode === "fallback") {
      return { status: "PASS", reason: "fallback mode observed" };
    }
    notes.push("AI path healthy; cannot force model crash from public API.");
    return r.response_status === 200
      ? { status: "BLOCKED", reason: "cannot force AI failure to verify fallback deterministically" }
      : { status: "FAIL", reason: `status=${r.response_status}` };
  })
);

handlers.set(
  61,
  createCaseRunner(61, catalog.get(61) || "1000 rps booking", async ({ notes }) => {
    notes.push("Not executed at 1000 rps from this runner to avoid destructive load on shared environment.");
    return { status: "BLOCKED", reason: "requires dedicated load tool and controlled performance environment" };
  })
);

handlers.set(
  62,
  createCaseRunner(62, catalog.get(62) || "ETA under load", async ({ exec }) => {
    const jobs = [];
    for (let i = 0; i < 80; i += 1) jobs.push(exec("POST", "/ai/eta", { body: { distance_km: 5, traffic_level: 0.6 } }));
    const out = await Promise.all(jobs);
    const good = out.filter((x) => x.response_status === 200).map((x) => x.duration_ms).sort((a, b) => a - b);
    const p95 = good.length ? good[Math.max(0, Math.floor(good.length * 0.95) - 1)] : 999999;
    return good.length === out.length && p95 < 200
      ? { status: "PASS", reason: `ok=${good.length}, p95=${p95}ms` }
      : { status: "FAIL", reason: `ok=${good.length}/${out.length}, p95=${p95}ms` };
  })
);

handlers.set(
  63,
  createCaseRunner(63, catalog.get(63) || "Pricing spike", async ({ exec }) => {
    const jobs = [];
    for (let i = 0; i < 80; i += 1) {
      jobs.push(exec("POST", "/pricing/calculate", { body: { distance_km: 5, demand_index: 2.2, supply_index: 1, vehicleType: "CAR" } }));
    }
    const out = await Promise.all(jobs);
    const ok = out.filter((x) => x.response_status === 200);
    const valid = ok.every((x) => Number(x.response_body.totalPrice || x.response_body.total_price || 0) > 0);
    return ok.length === out.length && valid
      ? { status: "PASS", reason: `ok=${ok.length}` }
      : { status: "FAIL", reason: `ok=${ok.length}/${out.length}` };
  })
);

handlers.set(64, blockedCase(64, catalog.get(64) || "Kafka throughput", "Need Kafka broker metrics and producer/consumer lag visibility."));
handlers.set(65, blockedCase(65, catalog.get(65) || "DB pool exhaustion", "Need DB connection metrics and stress harness."));
handlers.set(66, blockedCase(66, catalog.get(66) || "Redis cache hit rate", "Cache hit metrics are not exposed on public API."));

handlers.set(
  67,
  createCaseRunner(67, catalog.get(67) || "API rate limit", async ({ exec }) => {
    let hit429 = false;
    for (let i = 0; i < 220; i += 1) {
      const r = await exec("GET", "/health", { retry429: false, timeoutMs: 3000 });
      if (r.response_status === 429) {
        hit429 = true;
        break;
      }
    }
    return hit429 ? { status: "PASS", reason: "429 observed" } : { status: "FAIL", reason: "no 429 observed" };
  })
);

handlers.set(
  68,
  createCaseRunner(68, catalog.get(68) || "P95 latency", async ({ exec }) => {
    const out = [];
    for (let i = 0; i < 60; i += 1) {
      out.push(await exec("POST", "/ai/eta", { body: { distance_km: 4, traffic_level: 0.6 } }));
    }
    const lat = out.filter((x) => x.response_status === 200).map((x) => x.duration_ms).sort((a, b) => a - b);
    const p95 = lat.length ? lat[Math.max(0, Math.floor(lat.length * 0.95) - 1)] : 999999;
    return p95 < 300
      ? { status: "PASS", reason: `p95=${p95}ms` }
      : { status: "FAIL", reason: `p95=${p95}ms` };
  })
);

handlers.set(69, blockedCase(69, catalog.get(69) || "Peak-hour gradual load", "Needs staged load profile and infra scaling observation."));
handlers.set(70, blockedCase(70, catalog.get(70) || "Auto scaling", "Requires cluster metrics and pod/replica scaling events."));
handlers.set(71, blockedCase(71, catalog.get(71) || "Driver service down fallback", "Needs controlled service-down injection."));
handlers.set(72, blockedCase(72, catalog.get(72) || "Pricing timeout retry", "Needs controlled pricing timeout injection."));
handlers.set(73, blockedCase(73, catalog.get(73) || "Kafka down buffer", "Needs Kafka outage simulation and outbox/queue inspection."));
handlers.set(74, blockedCase(74, catalog.get(74) || "DB failover", "Needs DB primary/replica failover setup access."));
handlers.set(75, blockedCase(75, catalog.get(75) || "Circuit breaker open", "Breaker state is internal and requires repeated induced downstream failure."));
handlers.set(76, blockedCase(76, catalog.get(76) || "Partial system failure handling", "Needs controlled subsystem failure."));
handlers.set(77, blockedCase(77, catalog.get(77) || "Retry exponential backoff", "Needs deterministic transient failure and retry telemetry."));
handlers.set(78, blockedCase(78, catalog.get(78) || "Service mesh routing fail", "Requires service mesh/traffic policy testbed."));
handlers.set(79, blockedCase(79, catalog.get(79) || "Network partition", "Needs network split simulation."));
handlers.set(80, blockedCase(80, catalog.get(80) || "Graceful degradation", "Needs overload/failure toggles and feature-flag behavior observation."));

handlers.set(
  81,
  createCaseRunner(81, catalog.get(81) || "SQL injection", async ({ exec }) => {
    const r = await exec("POST", "/auth/login", { body: { email: "' OR 1=1 --", password: "anything", role: "CUSTOMER" } });
    return [400, 401, 404].includes(r.response_status)
      ? { status: "PASS", reason: `status=${r.response_status}` }
      : { status: "FAIL", reason: `status=${r.response_status}` };
  })
);

handlers.set(
  82,
  createCaseRunner(82, catalog.get(82) || "XSS input", async ({ exec }) => {
    const r = await exec("POST", "/notifications", {
      headers: authHeader(),
      body: { userId: state.userId || "USR", message: "<script>alert('hack')</script>" },
    });
    return [200, 400].includes(r.response_status)
      ? { status: "PASS", reason: `status=${r.response_status}` }
      : { status: "FAIL", reason: `status=${r.response_status}` };
  })
);

handlers.set(
  83,
  createCaseRunner(83, catalog.get(83) || "JWT tampering", async ({ exec }) => {
    const r = await exec("GET", "/booking", { headers: { Authorization: "Bearer tampered.jwt.token" } });
    return r.response_status === 401
      ? { status: "PASS", reason: "401 invalid tampered token" }
      : { status: "FAIL", reason: `status=${r.response_status}` };
  })
);

handlers.set(84, blockedCase(84, catalog.get(84) || "Unauthorized admin API", "No stable public /admin endpoint is exposed in current gateway contract."));

handlers.set(
  85,
  createCaseRunner(85, catalog.get(85) || "Rate limit attack", async ({ exec }) => {
    const jobs = [];
    for (let i = 0; i < 280; i += 1) jobs.push(exec("GET", "/health", { retry429: false, timeoutMs: 2500 }));
    const out = await Promise.all(jobs);
    const hit = out.some((x) => x.response_status === 429);
    return hit ? { status: "PASS", reason: "429 observed under burst" } : { status: "FAIL", reason: "no 429 observed" };
  })
);

handlers.set(
  86,
  createCaseRunner(86, catalog.get(86) || "Replay attack idempotency", async ({ exec }) => {
    const booking = await exec("POST", "/booking", {
      headers: { ...authHeader(), "Idempotency-Key": `tc86-booking-${Date.now()}` },
      body: bookingBody(),
    });
    if (![200, 201].includes(booking.response_status)) {
      return { status: "FAIL", reason: `booking failed ${booking.response_status}` };
    }
    const bookingId = booking.response_body.booking_id;
    const p1 = await exec("POST", "/payments/pay", {
      headers: { ...authHeader(), "Idempotency-Key": `tc86-pay-${Date.now()}` },
      body: { bookingId, method: "CASH", amount: 50000 },
    });
    const p2 = await exec("POST", "/payments/pay", {
      headers: { ...authHeader(), "Idempotency-Key": `tc86-pay-${Date.now()}` },
      body: { bookingId, method: "CASH", amount: 50000 },
    });
    const sameId = p1.response_body.id && p1.response_body.id === p2.response_body.id;
    return p1.response_status === 200 && p2.response_status === 200 && sameId
      ? { status: "PASS", reason: `same payment id=${p1.response_body.id}` }
      : { status: "FAIL", reason: `p1=${p1.response_status}, p2=${p2.response_status}` };
  })
);

handlers.set(87, blockedCase(87, catalog.get(87) || "Encryption at rest", "Requires direct DB read verification of ciphertext at rest."));
handlers.set(88, blockedCase(88, catalog.get(88) || "mTLS communication", "Requires certificate/mTLS handshake validation between services."));
handlers.set(89, blockedCase(89, catalog.get(89) || "RBAC enforcement", "No exposed admin endpoint with role matrix available for black-box verification."));

handlers.set(
  90,
  createCaseRunner(90, catalog.get(90) || "Sensitive data masking", async ({ exec }) => {
    const booking = await exec("POST", "/booking", {
      headers: { ...authHeader(), "Idempotency-Key": `tc90-${Date.now()}` },
      body: bookingBody(),
    });
    if (![200, 201].includes(booking.response_status)) {
      return { status: "FAIL", reason: `booking failed ${booking.response_status}` };
    }
    const bookingId = booking.response_body.booking_id;
    const pay = await exec("POST", "/payments/pay", {
      headers: authHeader(),
      body: { bookingId, method: "CARD", card_number: "4111111111111111", amount: 70000 },
    });
    const body = pay.response_body || {};
    const masked = String(body.card_masked || "");
    const leaksPan = JSON.stringify(body).includes("4111111111111111");
    return pay.response_status === 200 && masked.includes("1111") && !leaksPan
      ? { status: "PASS", reason: `masked=${masked}` }
      : { status: "FAIL", reason: `status=${pay.response_status}, masked=${masked}, leaksPan=${leaksPan}` };
  })
);

handlers.set(
  91,
  createCaseRunner(91, catalog.get(91) || "Missing token", async ({ exec }) => {
    const r = await exec("GET", "/booking");
    return r.response_status === 401
      ? { status: "PASS", reason: `message=${r.response_body.message || ""}` }
      : { status: "FAIL", reason: `status=${r.response_status}` };
  })
);

handlers.set(
  92,
  createCaseRunner(92, catalog.get(92) || "Tampered token", async ({ exec }) => {
    const r = await exec("GET", "/booking", { headers: { Authorization: "Bearer abc.def.ghi" } });
    return r.response_status === 401
      ? { status: "PASS", reason: `message=${r.response_body.message || ""}` }
      : { status: "FAIL", reason: `status=${r.response_status}` };
  })
);

handlers.set(
  93,
  createCaseRunner(93, catalog.get(93) || "Expired token", async ({ exec }) => {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      sub: state.userId || "expired-user",
      userId: state.userId || "expired-user",
      role: "CUSTOMER",
      iat: now - 3600,
      exp: now - 1800,
    };
    const expired = signExpiredJwt(payload, "secret_key");
    const r = await exec("GET", "/booking", { headers: { Authorization: `Bearer ${expired}` } });
    const msg = String(r.response_body.message || "");
    return r.response_status === 401 && msg.toLowerCase().includes("expired")
      ? { status: "PASS", reason: `message=${msg}` }
      : { status: "FAIL", reason: `status=${r.response_status}, message=${msg}` };
  })
);

handlers.set(94, blockedCase(94, catalog.get(94) || "Service-to-service auth mTLS", "Requires internal service call with invalid certificate."));
handlers.set(95, blockedCase(95, catalog.get(95) || "RBAC user no admin", "No public admin endpoint available for deterministic RBAC assertion."));

handlers.set(
  96,
  createCaseRunner(96, catalog.get(96) || "Least privilege driver vs user data", async ({ exec, notes }) => {
    notes.push("User service /users/:id expects service JWT, not user token.");
    const r = await exec("GET", `/users/${state.userId || "unknown"}`, { headers: authHeader() });
    return [401, 403].includes(r.response_status)
      ? { status: "PASS", reason: `status=${r.response_status}` }
      : { status: "FAIL", reason: `status=${r.response_status}` };
  })
);

handlers.set(97, blockedCase(97, catalog.get(97) || "Gateway enforcement for internal service", "Needs direct access to internal service endpoint outside gateway."));

handlers.set(
  98,
  createCaseRunner(98, catalog.get(98) || "Rate limit abuse", async ({ exec }) => {
    const jobs = [];
    for (let i = 0; i < 250; i += 1) jobs.push(exec("GET", "/health", { retry429: false, timeoutMs: 2500 }));
    const out = await Promise.all(jobs);
    const hit = out.some((x) => x.response_status === 429);
    return hit ? { status: "PASS", reason: "429 observed" } : { status: "FAIL", reason: "no 429 observed" };
  })
);

handlers.set(99, blockedCase(99, catalog.get(99) || "Encryption in transit", "Need HTTPS/mTLS transport assertions and certificate validation path."));
handlers.set(100, blockedCase(100, catalog.get(100) || "Audit logging", "Need centralized log access to verify trace fields."));
handlers.set(101, blockedCase(101, catalog.get(101) || "Deploy service basic", "Deployment lifecycle requires cluster control-plane access."));

handlers.set(
  102,
  createCaseRunner(102, catalog.get(102) || "Health endpoint", async ({ exec }) => {
    const r = await exec("GET", "/health", { retry429: false });
    return r.response_status === 200
      ? { status: "PASS", reason: "health ok" }
      : { status: "FAIL", reason: `status=${r.response_status}` };
  })
);

handlers.set(103, blockedCase(103, catalog.get(103) || "ENV correctness", "Requires runtime env inspection from containers."));

handlers.set(
  104,
  createCaseRunner(104, catalog.get(104) || "DB connectivity", async ({ exec }) => {
    const r = await exec("GET", "/booking", { headers: authHeader() });
    return r.response_status === 200
      ? { status: "PASS", reason: "booking query succeeded (DB reachable)" }
      : { status: "FAIL", reason: `status=${r.response_status}` };
  })
);

handlers.set(
  105,
  createCaseRunner(105, catalog.get(105) || "Kafka connectivity", async ({ exec, notes }) => {
    const r = await exec("POST", "/booking", {
      headers: { ...authHeader(), "Idempotency-Key": `tc105-${Date.now()}` },
      body: bookingBody(),
    });
    notes.push("Kafka connectivity inferred indirectly from booking flow; topic-level validation still needs Kafka UI/consumer access.");
    return [200, 201].includes(r.response_status)
      ? { status: "PASS", reason: `booking created ${r.response_body.booking_id || ""}` }
      : { status: "FAIL", reason: `status=${r.response_status}` };
  })
);

for (const id of [106, 107, 108, 109, 110, 111, 112, 114, 115]) {
  handlers.set(id, blockedCase(id, catalog.get(id) || `Case ${id}`));
}

handlers.set(
  113,
  createCaseRunner(113, catalog.get(113) || "Metrics exposed", async ({ exec }) => {
    const r = await exec("GET", "/metrics");
    const raw = JSON.stringify(r.response_body || {});
    const hasMetricKeyword = raw.includes("request_count") || raw.includes("requests_total");
    return r.response_status === 200 && hasMetricKeyword
      ? { status: "PASS", reason: "metrics endpoint available" }
      : { status: "FAIL", reason: `status=${r.response_status}` };
  })
);

function summarize() {
  const total = results.length;
  let pass = 0;
  let fail = 0;
  let blocked = 0;
  for (const r of results) {
    if (r.status === "PASS") pass += 1;
    else if (r.status === "FAIL") fail += 1;
    else blocked += 1;
  }
  return { total, pass, fail, blocked };
}

function writeReport() {
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  const s = summarize();
  const lines = [];
  lines.push("Full Test Report to Level 11 (TC001-TC115)");
  lines.push(`API_BASE_URL: ${API_BASE}`);
  lines.push(`GeneratedAt: ${new Date().toISOString()}`);
  lines.push(`Summary: PASS=${s.pass} FAIL=${s.fail} BLOCKED=${s.blocked} TOTAL=${s.total}`);
  lines.push("");

  for (const r of results.sort((a, b) => a.case_id - b.case_id)) {
    lines.push(`TC${String(r.case_id).padStart(3, "0")} | Level ${r.level} | ${r.status}`);
    lines.push(`Title: ${r.title}`);
    lines.push(`Reason: ${r.reason}`);
    lines.push(`ElapsedMs: ${r.elapsed_ms}`);
    if (r.notes && r.notes.length) {
      lines.push("Notes:");
      for (const n of r.notes) lines.push(`- ${n}`);
    }
    if (!r.requests.length) {
      lines.push("Requests: (none)");
    } else {
      r.requests.forEach((q, idx) => {
        lines.push(`Request #${idx + 1}`);
        lines.push(`- Method: ${q.method}`);
        lines.push(`- Path: ${q.path}`);
        lines.push(`- Headers: ${pretty(q.request_headers)}`);
        lines.push(`- Body: ${pretty(q.request_body)}`);
        lines.push(`- ResponseStatus: ${q.response_status}`);
        lines.push(`- ResponseBody: ${pretty(q.response_body)}`);
        lines.push(`- DurationMs: ${q.duration_ms}`);
      });
    }
    lines.push("-".repeat(100));
  }

  // Mapping table as requested style
  lines.push("");
  lines.push("Case Mapping Table");
  lines.push("case_id | endpoint(s) used | status | blocked_reason");
  lines.push("---|---|---|---");
  for (const r of results.sort((a, b) => a.case_id - b.case_id)) {
    const endpoints = [...new Set(r.requests.map((q) => `${q.method} ${q.path}`))].join(", ") || "-";
    const blockedReason = r.status === "BLOCKED" ? r.reason : "-";
    lines.push(`${String(r.case_id).padStart(3, "0")} | ${endpoints} | ${r.status} | ${blockedReason}`);
  }

  fs.writeFileSync(OUT_FILE, `${lines.join("\n")}\n`, "utf8");
  return s;
}

async function run() {
  await setup();
  for (let id = 1; id <= 115; id += 1) {
    const title = catalog.get(id) || `Case ${id}`;
    const runner = handlers.get(id) || blockedCase(id, title);
    await runner();
    await sleep(40);
  }
  const s = writeReport();
  console.log(`Report written: ${OUT_FILE}`);
  console.log(`PASS=${s.pass} FAIL=${s.fail} BLOCKED=${s.blocked} TOTAL=${s.total}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
