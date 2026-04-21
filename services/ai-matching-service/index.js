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

function rankDrivers(drivers = [], strategy = "balanced") {
  const candidates = drivers.filter((d) => d.status !== "OFFLINE");
  if (!candidates.length) return [];
  if (strategy === "nearest") {
    return [...candidates].sort(
      (a, b) => (a.distanceKm || a.distance || 999) - (b.distanceKm || b.distance || 999)
    );
  }
  if (strategy === "rating") {
    return [...candidates].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }
  return [...candidates].sort((a, b) => {
    const aScore = (a.rating || 0) * 1.5 - (a.eta || 0) * 0.8 - (a.price || 0) * 0.2;
    const bScore = (b.rating || 0) * 1.5 - (b.eta || 0) * 0.8 - (b.price || 0) * 0.2;
    return bScore - aScore;
  });
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

function reorderDriversByPreferredId(drivers = [], preferredId) {
  if (!preferredId) return drivers;
  const target = String(preferredId);
  const preferred = drivers.find((d) => String(d.id) === target);
  if (!preferred) return drivers;
  return [preferred, ...drivers.filter((d) => String(d.id) !== target)];
}

async function selectDriverWithOllama(trip, scoredDrivers = []) {
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
      const rankedDrivers = rankDrivers(body.drivers || [], strategy);
      if (!rankedDrivers.length) {
        metrics.fallbackCount += 1;
        return json(res, 200, {
          mode: "fallback",
          selected_driver: null,
          reason: "no_driver",
          decision_log: {
            strategy,
            selection_reason: "no_driver",
            trace_id: traceId,
            timestamp: new Date().toISOString(),
          },
        });
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
      const aiSelection = await selectDriverWithOllama(trip, rankedDrivers);
      const aiSelected = aiSelection
        ? rankedDrivers.find((d) => String(d.id) === String(aiSelection.driverId))
        : null;
      const selected = aiSelected || chooseDriver(rankedDrivers, strategy);
      if (!selected) {
        metrics.fallbackCount += 1;
        return json(res, 200, {
          mode: "fallback",
          selected_driver: null,
          reason: "no_driver",
          decision_log: {
            strategy,
            selection_reason: "no_driver",
            trace_id: traceId,
            timestamp: new Date().toISOString(),
          },
        });
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
          selection_reason: aiSelection?.reason || "rule_base_fallback",
          trace_id: traceId,
          timestamp: new Date().toISOString(),
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
  const drivers = await findNearbyDrivers(trip.pickup.lat, trip.pickup.lng, trip.vehicleType);
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
          await handleTripMessage({
            bookingId: data.booking_id,
            userId: data.user_id,
            pickup: data.pickup,
            dropoff: data.dropoff,
            vehicleType: data.vehicle_type,
            estimatedPrice: data.estimated_price,
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
