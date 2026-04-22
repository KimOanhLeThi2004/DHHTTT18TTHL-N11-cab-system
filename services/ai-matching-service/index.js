const crypto = require("crypto");
const { createServer } = require("./mtls");
const { consumer, producer } = require("./kafka");
const { findNearbyDrivers, reserveDriver } = require("./driverRepository");
const calculateScore = require("./scoring");
const { callOllamaGenerateViaMcp } = require("./ollamaMcpClient");

const port = Number(process.env.PORT || 3010);
const OLLAMA_ENABLED = process.env.OLLAMA_ENABLED !== "false";
const OLLAMA_MCP_ENABLED = process.env.OLLAMA_MCP_ENABLED !== "false";
const OLLAMA_MCP_TOOL = process.env.OLLAMA_MCP_TOOL || "ollama.generate";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://ollama:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:3b";
const OLLAMA_TIMEOUT_MS = Math.max(100, Number(process.env.OLLAMA_TIMEOUT_MS || 15000));
const OLLAMA_MAX_CANDIDATES = Math.max(1, Number(process.env.OLLAMA_MAX_CANDIDATES || 8));
const OLLAMA_NUM_PREDICT = Math.max(8, Number(process.env.OLLAMA_NUM_PREDICT || 64));
const OLLAMA_NUM_CTX = Math.max(512, Number(process.env.OLLAMA_NUM_CTX || 2048));
const OLLAMA_FAILURE_THRESHOLD = Math.max(1, Number(process.env.OLLAMA_FAILURE_THRESHOLD || 3));
const OLLAMA_FAILURE_COOLDOWN_MS = Math.max(
  1000,
  Number(process.env.OLLAMA_FAILURE_COOLDOWN_MS || 30000)
);
const OLLAMA_ERROR_LOG_COOLDOWN_MS = Math.max(
  1000,
  Number(process.env.OLLAMA_ERROR_LOG_COOLDOWN_MS || 10000)
);
const AGENT_ETA_RETRIES = Math.max(0, Number(process.env.AGENT_ETA_RETRIES || 2));
const AGENT_ETA_RETRY_BACKOFF_MS = Math.max(
  10,
  Number(process.env.AGENT_ETA_RETRY_BACKOFF_MS || 120)
);
const MATCH_AUDIT_TOPIC = process.env.MATCH_AUDIT_TOPIC || "ai.matching.audit";
const KAFKA_BOOTSTRAP_RETRY_MS = Math.max(
  1000,
  Number(process.env.KAFKA_BOOTSTRAP_RETRY_MS || 5000)
);
const metrics = {
  requests: 0,
  matchedTrips: 0,
  fallbackCount: 0,
  aiPreferredMatches: 0,
  ruleFallbackMatches: 0,
  startedAt: Date.now(),
};

let kafkaReady = false;
const ollamaState = {
  consecutiveFailures: 0,
  disabledUntil: 0,
  lastErrorLogAt: 0,
};

function json(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
    if (Buffer.concat(chunks).length > 1024 * 1024) {
      throw new Error("Payload Too Large");
    }
  }
  const raw = Buffer.concat(chunks).toString("utf8") || "{}";
  return JSON.parse(raw);
}

function calcEta(distanceKm, trafficLevel) {
  const d = Math.max(0, Number(distanceKm) || 0);
  const t = Math.max(0, Number(trafficLevel) || 0);
  if (d === 0) return 0;
  const speed = Math.max(10, 30 - t * 15);
  return Math.max(1, Math.round((d / speed) * 60));
}

function calcFraudScore(payload) {
  let score = 0.1;
  if (!payload.device_fingerprint) score += 0.3;
  if (!payload.location) score += 0.2;
  if (Number(payload.amount || 0) > 1_000_000) score += 0.3;
  return Math.min(1, score);
}

function recommendDrivers(drivers = []) {
  return [...drivers]
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 3);
}

function forecastPayload(input) {
  const demandIndex = Number(input.demand_index ?? input.demandIndex ?? 1);
  return {
    horizon: "1h",
    demand_index: Math.max(0, demandIndex),
    model_version: "forecast-v1",
  };
}

function toFiniteNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function clampMin(value, floor = 0) {
  const num = toFiniteNumber(value);
  if (num === null) return floor;
  return Math.max(floor, num);
}

function normalizeDistance(driver = {}) {
  const distance = toFiniteNumber(driver.distanceKm ?? driver.distance ?? driver.distance_km);
  return distance !== null ? Math.max(0, distance) : null;
}

function normalizeEta(driver = {}) {
  const eta = toFiniteNumber(driver.eta ?? driver.etaMin ?? driver.eta_min);
  return eta !== null ? Math.max(0, eta) : null;
}

function normalizePrice(driver = {}) {
  const price = toFiniteNumber(driver.price ?? driver.estimatedPrice ?? driver.estimated_price);
  return price !== null ? Math.max(0, price) : null;
}

function normalizeRating(driver = {}) {
  const rating = toFiniteNumber(driver.rating);
  return rating !== null ? Math.max(0, rating) : 0;
}

function normalizeDriverIdValue(driver = {}) {
  return normalizeDriverId(driver.id ?? driver.driverId ?? driver.driver_id);
}

function isDriverOnline(driver = {}) {
  if (typeof driver.online === "boolean") return driver.online;
  if (typeof driver.isOnline === "boolean") return driver.isOnline;
  if (typeof driver.available === "boolean") return driver.available;
  const status = String(driver.status || "ONLINE").toUpperCase();
  return !["OFFLINE", "INACTIVE", "DISCONNECTED", "BUSY"].includes(status);
}

function normalizeDriverForRanking(driver = {}) {
  const normalizedId = normalizeDriverIdValue(driver);
  return {
    ...driver,
    id: normalizedId || String(driver.id ?? driver.driverId ?? driver.driver_id ?? ""),
    distanceKm: normalizeDistance(driver),
    eta: normalizeEta(driver),
    price: normalizePrice(driver),
    rating: normalizeRating(driver),
  };
}

function normalizeScore(value, minValue, maxValue, preferLower = false) {
  if (!Number.isFinite(value)) return 0;
  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue) || maxValue <= minValue) {
    return 1;
  }
  const ratio = (value - minValue) / (maxValue - minValue);
  return preferLower ? 1 - ratio : ratio;
}

function estimatePriceForDriver({
  distanceKm,
  durationMin,
  vehicleType,
  demandIndex,
  supplyIndex,
  trafficLevel,
}) {
  const fareTable = {
    CAR: { baseFare: 12000, perKm: 8000, perMin: 700 },
    BIKE: { baseFare: 8000, perKm: 5000, perMin: 400 },
    SUV: { baseFare: 18000, perKm: 10000, perMin: 900 },
  };

  const type = String(vehicleType || "CAR").toUpperCase();
  const fare = fareTable[type] || fareTable.CAR;
  const safeDistance = clampMin(distanceKm, 0);
  const safeDuration =
    toFiniteNumber(durationMin) !== null
      ? clampMin(durationMin, 0)
      : calcEta(safeDistance, clampMin(trafficLevel, 0));
  const demand = clampMin(demandIndex, 0);
  const supply = Math.max(1, clampMin(supplyIndex, 0));
  const demandSurge = demand === 0 ? 1 : demand / supply;
  const surge = Math.max(1, demandSurge);

  return Math.max(
    fare.baseFare,
    Math.round((fare.baseFare + safeDistance * fare.perKm + safeDuration * fare.perMin) * surge)
  );
}

function parseToolFailureConfig(input = {}) {
  const etaFailures = toFiniteNumber(input?.eta);
  const pricingFailures = toFiniteNumber(input?.pricing);
  return {
    eta: Math.max(0, etaFailures ?? 0),
    pricing: Math.max(0, pricingFailures ?? 0),
  };
}

function createNoDriverResponse(strategy, traceId, reason = "no_driver", extra = {}) {
  return {
    mode: "fallback",
    selected_driver: null,
    reason,
    decision_log: {
      strategy,
      selection_reason: reason,
      trace_id: traceId,
      timestamp: new Date().toISOString(),
      ...extra,
    },
  };
}

async function runEtaTool({
  driver,
  trafficLevel,
  toolFailures,
  toolCalls,
  traceId,
}) {
  const distanceKm = normalizeDistance(driver);
  if (distanceKm === null) {
    return {
      eta: null,
      ok: false,
      reason: "missing_distance",
    };
  }

  let lastError = null;
  const maxAttempts = AGENT_ETA_RETRIES + 1;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const startedAt = Date.now();
    try {
      if (toolFailures.eta > 0) {
        toolFailures.eta -= 1;
        throw new Error("simulated_eta_failure");
      }

      const eta = calcEta(distanceKm, trafficLevel);
      toolCalls.push({
        tool: "eta",
        service: "eta-service",
        attempt,
        status: "ok",
        latency_ms: Date.now() - startedAt,
        trace_id: traceId,
      });
      return { eta, ok: true, reason: "eta_service" };
    } catch (err) {
      lastError = err;
      toolCalls.push({
        tool: "eta",
        service: "eta-service",
        attempt,
        status: "error",
        message: err?.message || "eta_tool_error",
        latency_ms: Date.now() - startedAt,
        trace_id: traceId,
      });
      if (attempt < maxAttempts) {
        await sleep(AGENT_ETA_RETRY_BACKOFF_MS * attempt);
      }
    }
  }

  return {
    eta: calcEta(distanceKm, trafficLevel),
    ok: false,
    reason: lastError?.message || "eta_tool_failed",
  };
}

async function runPricingTool({
  driver,
  vehicleType,
  demandIndex,
  supplyIndex,
  trafficLevel,
  toolFailures,
  toolCalls,
  traceId,
}) {
  const startedAt = Date.now();
  const distanceKm = normalizeDistance(driver);
  if (distanceKm === null) {
    return { price: null, ok: false, reason: "missing_distance" };
  }

  try {
    if (toolFailures.pricing > 0) {
      toolFailures.pricing -= 1;
      throw new Error("simulated_pricing_failure");
    }

    const price = estimatePriceForDriver({
      distanceKm,
      durationMin: driver.durationMin ?? driver.duration_min,
      vehicleType: driver.vehicleType || vehicleType,
      demandIndex,
      supplyIndex,
      trafficLevel,
    });

    toolCalls.push({
      tool: "pricing",
      service: "pricing-service",
      attempt: 1,
      status: "ok",
      latency_ms: Date.now() - startedAt,
      trace_id: traceId,
    });
    return { price, ok: true, reason: "pricing_service" };
  } catch (err) {
    toolCalls.push({
      tool: "pricing",
      service: "pricing-service",
      attempt: 1,
      status: "error",
      message: err?.message || "pricing_tool_error",
      latency_ms: Date.now() - startedAt,
      trace_id: traceId,
    });

    const fallbackPrice = estimatePriceForDriver({
      distanceKm,
      durationMin: driver.durationMin ?? driver.duration_min,
      vehicleType: driver.vehicleType || vehicleType,
      demandIndex,
      supplyIndex,
      trafficLevel,
    });
    return { price: fallbackPrice, ok: false, reason: err?.message || "pricing_tool_failed" };
  }
}

async function enrichDriversForSelection({
  drivers = [],
  strategy = "balanced",
  context = {},
  traceId,
  toolFailures = {},
  toolCalls = [],
}) {
  const onlineDrivers = drivers
    .filter((driver) => isDriverOnline(driver))
    .map((driver) => ({ ...driver }));

  const needEta = strategy === "balanced";
  const needPricing = strategy === "balanced";
  const trafficLevel = clampMin(context.trafficLevel ?? 0.5, 0);
  const demandIndex = clampMin(context.demandIndex ?? 1, 0);
  const supplyIndex = Math.max(1, clampMin(context.supplyIndex ?? 1, 0));
  const vehicleType = context.vehicleType || "CAR";

  const warnings = [];
  for (const driver of onlineDrivers) {
    if (needEta && normalizeEta(driver) === null) {
      const etaResult = await runEtaTool({
        driver,
        trafficLevel,
        toolFailures,
        toolCalls,
        traceId,
      });
      if (etaResult.eta !== null) {
        driver.eta = etaResult.eta;
      }
      if (!etaResult.ok) {
        warnings.push({
          driver_id: normalizeDriverIdValue(driver),
          tool: "eta",
          reason: etaResult.reason,
        });
      }
    }

    if (needPricing && normalizePrice(driver) === null) {
      const pricingResult = await runPricingTool({
        driver,
        vehicleType,
        demandIndex,
        supplyIndex,
        trafficLevel,
        toolFailures,
        toolCalls,
        traceId,
      });
      if (pricingResult.price !== null) {
        driver.price = pricingResult.price;
      }
      if (!pricingResult.ok) {
        warnings.push({
          driver_id: normalizeDriverIdValue(driver),
          tool: "pricing",
          reason: pricingResult.reason,
        });
      }
    }
  }

  return { drivers: onlineDrivers, warnings };
}

function rankDrivers(drivers = [], strategy = "balanced") {
  const candidates = drivers
    .filter((driver) => isDriverOnline(driver))
    .map((driver) => normalizeDriverForRanking(driver))
    .filter((driver) => Boolean(driver.id));
  if (!candidates.length) return [];

  if (strategy === "nearest") {
    return [...candidates].sort(
      (a, b) =>
        (a.distanceKm ?? 999) - (b.distanceKm ?? 999) ||
        (b.rating || 0) - (a.rating || 0) ||
        String(a.id).localeCompare(String(b.id))
    );
  }
  if (strategy === "rating") {
    return [...candidates].sort(
      (a, b) =>
        (b.rating || 0) - (a.rating || 0) ||
        (a.distanceKm ?? 999) - (b.distanceKm ?? 999) ||
        String(a.id).localeCompare(String(b.id))
    );
  }

  const enriched = candidates.map((driver) => ({
    ...driver,
    distanceKm: driver.distanceKm ?? 999,
    eta:
      driver.eta ??
      (driver.distanceKm === null ? 999 : calcEta(driver.distanceKm ?? 0, 0.5)),
    price:
      driver.price ??
      estimatePriceForDriver({
        distanceKm: driver.distanceKm ?? 30,
        durationMin: driver.durationMin ?? driver.duration_min,
        vehicleType: driver.vehicleType || "CAR",
        demandIndex: 1,
        supplyIndex: 1,
        trafficLevel: 0.5,
      }),
  }));

  const ratings = enriched.map((driver) => driver.rating || 0);
  const etas = enriched.map((driver) => driver.eta || 0);
  const prices = enriched.map((driver) => driver.price || 0);
  const distances = enriched.map((driver) => driver.distanceKm || 0);
  const minRating = Math.min(...ratings);
  const maxRating = Math.max(...ratings);
  const minEta = Math.min(...etas);
  const maxEta = Math.max(...etas);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minDistance = Math.min(...distances);
  const maxDistance = Math.max(...distances);

  return enriched
    .map((driver) => {
      const ratingNorm = normalizeScore(driver.rating || 0, minRating, maxRating, false);
      const etaNorm = normalizeScore(driver.eta || 0, minEta, maxEta, true);
      const priceNorm = normalizeScore(driver.price || 0, minPrice, maxPrice, true);
      const distanceNorm = normalizeScore(driver.distanceKm || 0, minDistance, maxDistance, true);
      const balancedScore =
        ratingNorm * 0.55 + etaNorm * 0.15 + priceNorm * 0.25 + distanceNorm * 0.05;
      return {
        ...driver,
        ranking_score: Number(balancedScore.toFixed(4)),
      };
    })
    .sort(
      (a, b) =>
        (b.ranking_score || 0) - (a.ranking_score || 0) ||
        String(a.id).localeCompare(String(b.id))
    );
}

function chooseDriver(drivers = [], strategy = "balanced") {
  const ranked = rankDrivers(drivers, strategy);
  return ranked[0] || null;
}

function normalizeDriverId(value) {
  if (value === undefined || value === null) return null;
  const id = String(value).trim();
  return id || null;
}

function normalizeDriverIdList(values = []) {
  if (!Array.isArray(values)) return [];
  const seen = new Set();
  for (const value of values) {
    const id = normalizeDriverId(value);
    if (id) {
      seen.add(id);
    }
  }
  return Array.from(seen);
}

function reorderDriversByPreferredId(drivers = [], preferredId) {
  if (!preferredId) return drivers;
  const target = String(preferredId);
  const preferred = drivers.find((d) => String(d.id) === target);
  if (!preferred) return drivers;
  return [preferred, ...drivers.filter((d) => String(d.id) !== target)];
}

async function selectDriverWithOllama(trip, scoredDrivers = [], options = {}) {
  if (options.forceFail) {
    throw new Error("forced_ai_failure");
  }
  if (!OLLAMA_ENABLED || !OLLAMA_MCP_ENABLED || !scoredDrivers.length) {
    return null;
  }
  if (Date.now() < ollamaState.disabledUntil) {
    return null;
  }

  const candidates = scoredDrivers.slice(0, OLLAMA_MAX_CANDIDATES).map((d, index) => ({
    rank: index + 1,
    driverId: d.id,
    distanceKm: Number(d.distanceKm || d.distance || 0),
    score: Number(d.score || 0),
    rating: Number(d.rating || 0),
    eta: Number(d.eta || 0),
    vehicleType: d.vehicleType || "UNKNOWN",
  }));

  const prompt = [
    "You are a taxi dispatch selector.",
    "Pick exactly one best driver from the candidates list.",
    "Must only use driverId values from candidates.",
    "Return strict JSON with keys driverId and reason.",
    "Candidates are pre-ranked by strategy, prefer rank 1 unless there is a clear reason.",
    `booking=${JSON.stringify({
      bookingId: trip.bookingId,
      pickup: trip.pickup,
      dropoff: trip.dropoff,
      vehicleType: trip.vehicleType,
      estimatedPrice: trip.estimatedPrice,
      strategy: trip.strategy || "balanced",
    })}`,
    `candidates=${JSON.stringify(candidates)}`,
  ].join("\n");

  try {
    const raw = await callOllamaGenerateViaMcp({
      prompt,
      model: OLLAMA_MODEL,
      format: "json",
      options: {
        temperature: 0,
        top_p: 0.9,
        num_predict: OLLAMA_NUM_PREDICT,
        num_ctx: OLLAMA_NUM_CTX,
      },
      timeoutMs: OLLAMA_TIMEOUT_MS,
      toolName: OLLAMA_MCP_TOOL,
    });
    if (!raw || typeof raw !== "string") return null;

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (_) {
      return null;
    }

    const selectedDriverId = normalizeDriverId(parsed.driverId || parsed.driver_id || parsed.id);
    if (!selectedDriverId) return null;

    const exists = scoredDrivers.some((d) => String(d.id) === selectedDriverId);
    if (!exists) return null;

    ollamaState.consecutiveFailures = 0;
    ollamaState.disabledUntil = 0;

    return {
      driverId: selectedDriverId,
      reason: parsed.reason || "selected_by_ollama",
    };
  } catch (err) {
    const msg = err?.message || "unknown_ollama_error";
    ollamaState.consecutiveFailures += 1;
    if (ollamaState.consecutiveFailures >= OLLAMA_FAILURE_THRESHOLD) {
      ollamaState.disabledUntil = Date.now() + OLLAMA_FAILURE_COOLDOWN_MS;
    }

    const shouldLog = Date.now() - ollamaState.lastErrorLogAt >= OLLAMA_ERROR_LOG_COOLDOWN_MS;
    if (shouldLog) {
      ollamaState.lastErrorLogAt = Date.now();
      const cooldownSec = Math.ceil(
        Math.max(0, ollamaState.disabledUntil - Date.now()) / 1000
      );
      const suffix = cooldownSec > 0 ? `; retry after ~${cooldownSec}s` : "";
      console.warn(`Ollama MCP selection failed: ${msg}${suffix}`);
    }
    return null;
  }
}

async function publishMatchingAudit({ eventType, trip, selectedDriverId = null, reason = null }) {
  try {
    await producer.send({
      topic: MATCH_AUDIT_TOPIC,
      messages: [
        {
          value: JSON.stringify({
            eventType,
            bookingId: trip.bookingId,
            userId: trip.userId ?? trip.user_id ?? null,
            selectedDriverId,
            reason,
            model: OLLAMA_MODEL,
            transport: "mcp",
            timestamp: new Date().toISOString(),
          }),
        },
      ],
    });
  } catch (err) {
    console.warn(`Matching audit publish failed: ${err?.message || "unknown_error"}`);
  }
}

async function handleHttp(req, res) {
  metrics.requests += 1;
  const path = req.url.split("?")[0];
  const traceId = req.headers["x-request-id"] || crypto.randomUUID();
  try {
    if (req.method === "GET" && path === "/health") {
      return json(res, 200, { status: "ok", service: "ai-matching-service" });
    }
    if (req.method === "GET" && path === "/metrics") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      return res.end(
        [
          `request_count ${metrics.requests}`,
          `matched_trips ${metrics.matchedTrips}`,
          `fallback_count ${metrics.fallbackCount}`,
          `ai_preferred_matches ${metrics.aiPreferredMatches}`,
          `rule_fallback_matches ${metrics.ruleFallbackMatches}`,
          `uptime_ms ${Date.now() - metrics.startedAt}`,
        ].join("\n")
      );
    }

    if (req.method === "POST" && (path === "/ai/eta" || path === "/eta")) {
      const body = await readJsonBody(req);
      const distanceKm = Number(body.distance_km ?? body.distanceKm ?? 0);
      const trafficLevel = Number(body.traffic_level ?? body.trafficLevel ?? 0.5);
      if (!Number.isFinite(distanceKm) || distanceKm < 0) {
        return json(res, 422, { message: "distance_km must be a non-negative number" });
      }
      return json(res, 200, { eta: calcEta(distanceKm, trafficLevel), model_version: "eta-v1" });
    }

    if (req.method === "POST" && (path === "/ai/fraud" || path === "/fraud")) {
      const body = await readJsonBody(req);
      const required = ["user_id", "driver_id", "booking_id", "amount", "location", "device_fingerprint"];
      const missing = required.filter((k) => body[k] === undefined || body[k] === null || body[k] === "");
      if (missing.length) {
        return json(res, 400, { message: "missing required fields", missing });
      }
      const fraud_score = calcFraudScore(body);
      return json(res, 200, {
        fraud_score,
        flagged: fraud_score >= Number(process.env.FRAUD_THRESHOLD || 0.7),
        model_version: "fraud-v1",
      });
    }

    if (
      req.method === "POST" &&
      (path === "/ai/recommendations" || path === "/recommendations")
    ) {
      const body = await readJsonBody(req);
      return json(res, 200, {
        top_drivers: recommendDrivers(body.drivers || []),
        model_version: "recommend-v1",
      });
    }

    if (req.method === "POST" && (path === "/ai/forecast" || path === "/forecast")) {
      const body = await readJsonBody(req);
      return json(res, 200, forecastPayload(body));
    }

    if (
      req.method === "POST" &&
      (path === "/ai/agent/select-driver" || path === "/agent/select-driver")
    ) {
      const body = await readJsonBody(req);
      const strategy = body.strategy || "balanced";
      const toolCalls = [];
      const toolFailures = parseToolFailureConfig(body.tool_failures || body.toolFailures || {});
      const forceAiFail = Boolean(body.force_ai_fail || body.forceAiFail || body.simulate_ai_fail);
      const context = {
        vehicleType: body.vehicleType ?? body.vehicle_type ?? "CAR",
        demandIndex: body.demand_index ?? body.demandIndex ?? 1,
        supplyIndex: body.supply_index ?? body.supplyIndex ?? 1,
        trafficLevel: body.traffic_level ?? body.trafficLevel ?? 0.5,
      };

      const enriched = await enrichDriversForSelection({
        drivers: body.drivers || [],
        strategy,
        context,
        traceId,
        toolFailures,
        toolCalls,
      });
      const rankedDrivers = rankDrivers(enriched.drivers || [], strategy);
      if (!rankedDrivers.length) {
        metrics.fallbackCount += 1;
        return json(
          res,
          200,
          createNoDriverResponse(strategy, traceId, "no_driver", {
            tools_called: toolCalls,
            warnings: enriched.warnings,
          })
        );
      }

      const trip = {
        bookingId: body.bookingId ?? body.booking_id ?? "adhoc-selection",
        pickup: body.pickup ?? null,
        dropoff: body.dropoff ?? null,
        vehicleType:
          body.vehicleType ??
          body.vehicle_type ??
          rankedDrivers[0]?.vehicleType ??
          "CAR",
        estimatedPrice: Number(body.estimatedPrice ?? body.estimated_price ?? body.price ?? 0),
        strategy,
      };
      let aiSelection = null;
      let aiError = null;
      try {
        aiSelection = await selectDriverWithOllama(trip, rankedDrivers, { forceFail: forceAiFail });
      } catch (err) {
        aiError = err?.message || "ai_selection_failed";
      }
      const aiSelected = aiSelection
        ? rankedDrivers.find((d) => String(d.id) === String(aiSelection.driverId))
        : null;
      const selected = aiSelected || chooseDriver(rankedDrivers, strategy);
      if (!selected) {
        metrics.fallbackCount += 1;
        return json(
          res,
          200,
          createNoDriverResponse(strategy, traceId, "no_driver", {
            tools_called: toolCalls,
            warnings: enriched.warnings,
          })
        );
      }

      if (aiSelected) {
        metrics.aiPreferredMatches += 1;
      } else {
        metrics.ruleFallbackMatches += 1;
      }

      return json(res, 200, {
        mode: aiSelected ? "ai" : "fallback",
        selected_driver: selected,
        decision_log: {
          strategy,
          selection_reason: aiSelection?.reason || aiError || "rule_base_fallback",
          trace_id: traceId,
          timestamp: new Date().toISOString(),
          tools_called: toolCalls,
          warnings: enriched.warnings,
          candidate_count: rankedDrivers.length,
          ai_enabled: OLLAMA_ENABLED && OLLAMA_MCP_ENABLED,
          ai_selected: Boolean(aiSelected),
          force_ai_fail: forceAiFail,
        },
      });
    }

    if (req.method === "GET" && (path === "/ai/model-info" || path === "/model-info")) {
      return json(res, 200, {
        eta_model_version: "eta-v1",
        pricing_model_version: "pricing-v2",
        fraud_model_version: "fraud-v1",
        llm_provider: OLLAMA_ENABLED && OLLAMA_MCP_ENABLED ? "mcp" : "disabled",
        ollama_transport: OLLAMA_ENABLED && OLLAMA_MCP_ENABLED ? "mcp" : "disabled",
        ollama_base_url: OLLAMA_BASE_URL,
        ollama_model: OLLAMA_MODEL,
        ollama_mcp_tool: OLLAMA_MCP_TOOL,
      });
    }

    return json(res, 404, { message: "Not Found" });
  } catch (err) {
    if (err.message === "Payload Too Large") {
      return json(res, 413, { message: "Payload Too Large" });
    }
    return json(res, 400, { message: err.message || "Invalid request" });
  }
}

async function handleTripMessage(trip) {
  const excludedDriverIds = normalizeDriverIdList([
    ...(Array.isArray(trip.excludedDriverIds) ? trip.excludedDriverIds : []),
    trip.rejectedDriverId,
    trip.rejected_driver_id,
  ]);

  const nearbyDrivers = await findNearbyDrivers(trip.pickup.lat, trip.pickup.lng, trip.vehicleType);
  const drivers = nearbyDrivers.filter((driver) => {
    const driverId = normalizeDriverId(driver.id);
    return driverId && !excludedDriverIds.includes(driverId);
  });
  if (!drivers.length) {
    return;
  }

  const scoredDrivers = drivers
    .map((d) => ({
      ...d,
      score: calculateScore(d, {
        pickup: trip.pickup,
        dropoff: trip.dropoff,
        estimatedPrice: trip.estimatedPrice,
      }),
    }))
    .sort((a, b) => b.score - a.score);

  const aiSelection = await selectDriverWithOllama(trip, scoredDrivers);
  const prioritizedDrivers = aiSelection
    ? reorderDriversByPreferredId(scoredDrivers, aiSelection.driverId)
    : scoredDrivers;

  if (aiSelection) {
    metrics.aiPreferredMatches += 1;
    await publishMatchingAudit({
      eventType: "qwen_match_success",
      trip,
      selectedDriverId: aiSelection.driverId,
      reason: aiSelection.reason || "selected_by_ollama",
    });
  } else {
    metrics.ruleFallbackMatches += 1;
  }

  for (const driver of prioritizedDrivers) {
    const locked = await reserveDriver(driver.id);
    if (locked) {
      metrics.matchedTrips += 1;
      await producer.send({
        topic: "driver.assigned.requested",
        messages: [
          {
            value: JSON.stringify({
              bookingId: trip.bookingId,
              userId: trip.userId ?? trip.user_id ?? null,
              driverId: driver.id,
              pickup: trip.pickup,
              dropoff: trip.dropoff,
              price: trip.estimatedPrice,
              selectionMode: aiSelection ? "ollama" : "rules",
              matchingMode: aiSelection ? "qwen_mcp" : "rule_base",
              qwenMatchSuccess: Boolean(aiSelection),
              qwenSelectedDriverId: aiSelection?.driverId || null,
              selectedViaMcp: Boolean(aiSelection),
              selectionReason: aiSelection?.reason || "score_ranked",
            }),
          },
        ],
      });
      return;
    }
  }

  metrics.fallbackCount += 1;
}

async function startKafka() {
  await consumer.connect();
  await producer.connect();
  await consumer.subscribe({ topic: "BOOKING_CREATED" });
  await consumer.subscribe({ topic: "ride_events" });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const data = JSON.parse(message.value.toString());

        if (topic === "BOOKING_CREATED") {
          await handleTripMessage(data);
          return;
        }

        if (topic === "ride_events" && data.event_type === "ride_requested") {
          const excludedDriverIds = normalizeDriverIdList([
            ...(Array.isArray(data.excluded_driver_ids) ? data.excluded_driver_ids : []),
            ...(Array.isArray(data.excludedDriverIds) ? data.excludedDriverIds : []),
            data.rejected_driver_id,
            data.rejectedDriverId,
          ]);

          await handleTripMessage({
            bookingId: data.booking_id,
            userId: data.user_id,
            pickup: data.pickup,
            dropoff: data.dropoff,
            vehicleType: data.vehicle_type,
            estimatedPrice: data.estimated_price,
            excludedDriverIds,
          });
        }
      } catch (err) {
        console.error("ai-matching eachMessage error:", err.message);
      }
    },
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resetKafkaClients() {
  try {
    await consumer.disconnect();
  } catch (_) {
    // Ignore when consumer is not connected yet.
  }

  try {
    await producer.disconnect();
  } catch (_) {
    // Ignore when producer is not connected yet.
  }
}

async function startKafkaWithRetry() {
  while (!kafkaReady) {
    try {
      await startKafka();
      kafkaReady = true;
      console.log("AI matching kafka consumer/producer connected");
      return;
    } catch (err) {
      console.error("AI matching kafka bootstrap failed:", err.message);
      await resetKafkaClients();
      console.log(`Retrying kafka bootstrap in ${KAFKA_BOOTSTRAP_RETRY_MS}ms`);
      await sleep(KAFKA_BOOTSTRAP_RETRY_MS);
    }
  }
}

function startHttpServer() {
  const { server, protocol } = createServer((req, res) => {
    handleHttp(req, res);
  }, "ai-matching-service");
  server.listen(port, () => {
    console.log(`AI matching service running on ${protocol}://0.0.0.0:${port}`);
  });
}

startHttpServer();
startKafkaWithRetry();
