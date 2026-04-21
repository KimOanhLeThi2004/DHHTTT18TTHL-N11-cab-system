import http from "k6/http";
import { check, fail, sleep } from "k6";
import exec from "k6/execution";
import { Counter } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const CASE_ID = Number(__ENV.CASE_ID || 61);

const rateLimitedResponses = new Counter("rate_limited_responses");
const cacheHitObserved = new Counter("cache_hit_observed");

function thresholdsForCase(caseId) {
  const base = {
    checks: ["rate>0.95"],
  };

  if (caseId === 67) {
    return {
      ...base,
      rate_limited_responses: ["count>0"],
    };
  }

  if (caseId === 68) {
    return {
      ...base,
      http_req_duration: ["p(95)<300"],
      http_req_failed: ["rate<0.05"],
    };
  }

  if (caseId === 61 || caseId === 62 || caseId === 63 || caseId === 69) {
    return {
      ...base,
      http_req_failed: ["rate<0.05"],
    };
  }

  return {
    ...base,
    http_req_failed: ["rate<0.10"],
  };
}

function optionsForCase(caseId) {
  if (caseId === 61) {
    return {
      scenarios: {
        booking_rps: {
          executor: "constant-arrival-rate",
          rate: Number(__ENV.RATE || 1000),
          timeUnit: "1s",
          duration: __ENV.DURATION || "2m",
          preAllocatedVUs: Number(__ENV.PRE_ALLOCATED_VUS || 250),
          maxVUs: Number(__ENV.MAX_VUS || 1200),
        },
      },
      thresholds: thresholdsForCase(caseId),
    };
  }

  if (caseId === 62) {
    return {
      scenarios: {
        eta_load: {
          executor: "constant-arrival-rate",
          rate: Number(__ENV.RATE || 500),
          timeUnit: "1s",
          duration: __ENV.DURATION || "2m",
          preAllocatedVUs: Number(__ENV.PRE_ALLOCATED_VUS || 150),
          maxVUs: Number(__ENV.MAX_VUS || 600),
        },
      },
      thresholds: {
        ...thresholdsForCase(caseId),
        http_req_duration: ["p(95)<200"],
      },
    };
  }

  if (caseId === 63 || caseId === 69) {
    return {
      scenarios: {
        spike_or_peak: {
          executor: "ramping-arrival-rate",
          startRate: Number(__ENV.START_RATE || 50),
          timeUnit: "1s",
          preAllocatedVUs: Number(__ENV.PRE_ALLOCATED_VUS || 120),
          maxVUs: Number(__ENV.MAX_VUS || 800),
          stages: [
            { target: Number(__ENV.STAGE1 || 100), duration: __ENV.STAGE1_DURATION || "30s" },
            { target: Number(__ENV.STAGE2 || 300), duration: __ENV.STAGE2_DURATION || "60s" },
            { target: Number(__ENV.STAGE3 || 600), duration: __ENV.STAGE3_DURATION || "60s" },
            { target: Number(__ENV.STAGE4 || 100), duration: __ENV.STAGE4_DURATION || "30s" },
          ],
        },
      },
      thresholds: thresholdsForCase(caseId),
    };
  }

  return {
    vus: Number(__ENV.VUS || 30),
    duration: __ENV.DURATION || "1m",
    thresholds: thresholdsForCase(caseId),
  };
}

export const options = optionsForCase(CASE_ID);

function jsonHeaders(token, extra = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const keys = Object.keys(extra);
  for (const key of keys) {
    headers[key] = extra[key];
  }
  return headers;
}

function randomEmail(prefix = "k6") {
  const seed = `${Date.now()}_${exec.vu.idInTest}_${exec.vu.iterationInScenario}`;
  return `${prefix}_${seed}@example.com`;
}

function registerAndLoginCustomer() {
  const email = randomEmail("perf");
  const password = __ENV.TEST_PASSWORD || "Passw0rd!";

  const registerPayload = JSON.stringify({
    email,
    password,
    role: "CUSTOMER",
    name: "k6 customer",
    phone: "0900000000",
  });
  http.post(`${BASE_URL}/auth/register`, registerPayload, { headers: jsonHeaders() });

  const loginPayload = JSON.stringify({
    email,
    password,
    role: "CUSTOMER",
  });
  const loginRes = http.post(`${BASE_URL}/auth/login`, loginPayload, { headers: jsonHeaders() });
  const ok = check(loginRes, {
    "setup login success": (r) => r.status === 200,
    "setup token exists": (r) => {
      try {
        const body = JSON.parse(r.body);
        return !!body.accessToken;
      } catch (_) {
        return false;
      }
    },
  });
  if (!ok) {
    fail(`setup failed: ${loginRes.status} ${loginRes.body}`);
  }
  return JSON.parse(loginRes.body).accessToken;
}

function bookingPayload() {
  const noise = exec.vu.iterationInScenario;
  return {
    pickup: { lat: 10.7601 + noise * 0.00001, lng: 106.6601 + noise * 0.00001 },
    dropoff: { lat: 10.7701, lng: 106.6701 },
    distanceKm: 3,
    durationMin: 7,
    vehicleType: "CAR",
  };
}

function createBooking(token, extraHeaders = {}) {
  return http.post(
    `${BASE_URL}/booking`,
    JSON.stringify(bookingPayload()),
    { headers: jsonHeaders(token, extraHeaders) }
  );
}

function postEta() {
  return http.post(
    `${BASE_URL}/ai/eta`,
    JSON.stringify({ distance_km: 5, traffic_level: 0.6 }),
    { headers: jsonHeaders() }
  );
}

function postPricing() {
  return http.post(
    `${BASE_URL}/pricing/calculate`,
    JSON.stringify({
      distance_km: 5,
      demand_index: 2,
      supply_index: 1,
      vehicleType: "CAR",
    }),
    { headers: jsonHeaders() }
  );
}

export function setup() {
  return {
    token: registerAndLoginCustomer(),
  };
}

function case61(data) {
  const res = createBooking(data.token, {
    "Idempotency-Key": `c61-${exec.vu.idInTest}-${exec.vu.iterationInScenario}-${Date.now()}`,
  });
  check(res, {
    "c61 booking success": (r) => r.status === 201 || r.status === 200,
  });
}

function case62() {
  const res = postEta();
  check(res, {
    "c62 eta status 200": (r) => r.status === 200,
    "c62 eta field exists": (r) => {
      try {
        const body = JSON.parse(r.body);
        return typeof body.eta === "number";
      } catch (_) {
        return false;
      }
    },
  });
}

function case63() {
  const res = postPricing();
  check(res, {
    "c63 pricing ok": (r) => r.status === 200,
    "c63 price valid": (r) => {
      try {
        const body = JSON.parse(r.body);
        return Number(body.totalPrice || body.price || 0) > 0;
      } catch (_) {
        return false;
      }
    },
  });
}

function case64(data) {
  const res = createBooking(data.token, {
    "Idempotency-Key": `c64-${exec.vu.idInTest}-${exec.vu.iterationInScenario}-${Date.now()}`,
  });
  check(res, {
    "c64 no server error": (r) => r.status < 500,
  });
}

function case65(data) {
  const res = createBooking(data.token, {
    "Idempotency-Key": `c65-${exec.vu.idInTest}-${exec.vu.iterationInScenario}-${Date.now()}`,
  });
  check(res, {
    "c65 no db crash": (r) => r.status < 500,
  });
}

function case66(data) {
  const idem = `c66-${exec.vu.idInTest}-${Math.floor(exec.vu.iterationInScenario / 2)}`;
  const r1 = createBooking(data.token, { "Idempotency-Key": idem });
  const r2 = createBooking(data.token, { "Idempotency-Key": idem });
  if (r2.timings.duration <= r1.timings.duration * 1.2) {
    cacheHitObserved.add(1);
  }
  check(r2, {
    "c66 repeated request stable": (r) => r.status === 200 || r.status === 201,
  });
}

function case67(data) {
  const res = createBooking(data.token, {
    "Idempotency-Key": `c67-${exec.vu.idInTest}-${exec.vu.iterationInScenario}-${Date.now()}`,
  });
  if (res.status === 429) {
    rateLimitedResponses.add(1);
  }
  check(res, {
    "c67 expected status": (r) => [200, 201, 429].includes(r.status),
  });
}

function case68(data) {
  const res = createBooking(data.token, {
    "Idempotency-Key": `c68-${exec.vu.idInTest}-${exec.vu.iterationInScenario}-${Date.now()}`,
  });
  check(res, {
    "c68 booking stable": (r) => r.status === 200 || r.status === 201,
  });
}

function case69(data) {
  const res = createBooking(data.token, {
    "Idempotency-Key": `c69-${exec.vu.idInTest}-${exec.vu.iterationInScenario}-${Date.now()}`,
  });
  check(res, {
    "c69 still serves booking": (r) => r.status < 500,
  });
}

function case70(data) {
  const res = createBooking(data.token, {
    "Idempotency-Key": `c70-${exec.vu.idInTest}-${exec.vu.iterationInScenario}-${Date.now()}`,
  });
  check(res, {
    "c70 load signal still healthy": (r) => r.status < 500,
  });
}

function case71(data) {
  const res = createBooking(data.token, {
    "Idempotency-Key": `c71-${exec.vu.idInTest}-${exec.vu.iterationInScenario}-${Date.now()}`,
  });
  check(res, {
    "c71 controlled result": (r) => [200, 201, 409, 503].includes(r.status),
  });
}

function case72(data) {
  const res = createBooking(data.token, {
    "Idempotency-Key": `c72-${exec.vu.idInTest}-${exec.vu.iterationInScenario}-${Date.now()}`,
  });
  check(res, {
    "c72 no crash": (r) => r.status < 500 || r.status === 503,
  });
}

function case73(data) {
  const res = createBooking(data.token, {
    "Idempotency-Key": `c73-${exec.vu.idInTest}-${exec.vu.iterationInScenario}-${Date.now()}`,
  });
  check(res, {
    "c73 graceful when kafka issue": (r) => [201, 503].includes(r.status),
  });
}

function case74(data) {
  const res = createBooking(data.token, {
    "Idempotency-Key": `c74-${exec.vu.idInTest}-${exec.vu.iterationInScenario}-${Date.now()}`,
  });
  check(res, {
    "c74 controlled db failover behavior": (r) => [200, 201, 503].includes(r.status),
  });
}

function case75(data) {
  const res = createBooking(data.token, {
    "Idempotency-Key": `c75-${exec.vu.idInTest}-${exec.vu.iterationInScenario}-${Date.now()}`,
  });
  check(res, {
    "c75 no cascade crash": (r) => r.status < 500 || r.status === 503,
  });
}

function case76(data) {
  const bookingRes = createBooking(data.token, {
    "Idempotency-Key": `c76-${exec.vu.idInTest}-${exec.vu.iterationInScenario}-${Date.now()}`,
  });
  const etaRes = postEta();
  check(bookingRes, {
    "c76 booking still responds": (r) => r.status < 500 || r.status === 503,
  });
  check(etaRes, {
    "c76 eta still responds": (r) => r.status === 200,
  });
}

function case77() {
  let success = false;
  let waitSec = 1;
  for (let i = 0; i < 3; i += 1) {
    const res = postPricing();
    if (res.status === 200) {
      success = true;
      break;
    }
    sleep(waitSec);
    waitSec *= 2;
  }
  check(success, {
    "c77 retry with backoff eventually succeeds": (v) => v === true,
  });
}

function case78(data) {
  const res = createBooking(data.token, {
    "Idempotency-Key": `c78-${exec.vu.idInTest}-${exec.vu.iterationInScenario}-${Date.now()}`,
  });
  check(res, {
    "c78 mesh routing failure handled": (r) => [200, 201, 503].includes(r.status),
  });
}

function case79(data) {
  const res = createBooking(data.token, {
    "Idempotency-Key": `c79-${exec.vu.idInTest}-${exec.vu.iterationInScenario}-${Date.now()}`,
  });
  check(res, {
    "c79 network partition graceful": (r) => [200, 201, 503].includes(r.status),
  });
}

function case80(data) {
  const bookingRes = createBooking(data.token, {
    "Idempotency-Key": `c80-${exec.vu.idInTest}-${exec.vu.iterationInScenario}-${Date.now()}`,
  });
  const aiRes = http.post(
    `${BASE_URL}/ai/recommendations`,
    JSON.stringify({
      drivers: [
        { id: "D1", rating: 4.6 },
        { id: "D2", rating: 4.8 },
      ],
    }),
    { headers: jsonHeaders() }
  );
  check(bookingRes, {
    "c80 core booking still alive": (r) => r.status < 500 || r.status === 503,
  });
  check(aiRes, {
    "c80 optional ai endpoint responds": (r) => r.status === 200 || r.status === 503,
  });
}

export default function (data) {
  switch (CASE_ID) {
    case 61: return case61(data);
    case 62: return case62();
    case 63: return case63();
    case 64: return case64(data);
    case 65: return case65(data);
    case 66: return case66(data);
    case 67: return case67(data);
    case 68: return case68(data);
    case 69: return case69(data);
    case 70: return case70(data);
    case 71: return case71(data);
    case 72: return case72(data);
    case 73: return case73(data);
    case 74: return case74(data);
    case 75: return case75(data);
    case 76: return case76(data);
    case 77: return case77();
    case 78: return case78(data);
    case 79: return case79(data);
    case 80: return case80(data);
    default:
      fail(`Unsupported CASE_ID=${CASE_ID}. Use 61..80.`);
  }
}
