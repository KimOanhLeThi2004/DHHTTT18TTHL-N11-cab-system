const { createServer } = require("./mtls");
const { consumer, producer } = require("./kafka");
const { findNearbyDrivers, reserveDriver } = require("./driverRepository");
const calculateScore = require("./scoring");

const port = Number(process.env.PORT || 3010);
const metrics = {
  requests: 0,
  matchedTrips: 0,
  fallbackCount: 0,
  startedAt: Date.now(),
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

function chooseDriver(drivers = [], strategy = "balanced") {
  const candidates = drivers.filter((d) => d.status !== "OFFLINE");
  if (!candidates.length) return null;
  if (strategy === "nearest") {
    return [...candidates].sort(
      (a, b) => (a.distanceKm || a.distance || 999) - (b.distanceKm || b.distance || 999)
    )[0];
  }
  if (strategy === "rating") {
    return [...candidates].sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
  }
  return [...candidates].sort((a, b) => {
    const aScore = (a.rating || 0) * 1.5 - (a.eta || 0) * 0.8 - (a.price || 0) * 0.2;
    const bScore = (b.rating || 0) * 1.5 - (b.eta || 0) * 0.8 - (b.price || 0) * 0.2;
    return bScore - aScore;
  })[0];
}

async function handleHttp(req, res) {
  metrics.requests += 1;
  const path = req.url.split("?")[0];
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
      const selected = chooseDriver(body.drivers || [], body.strategy || "balanced");
      if (!selected) {
        metrics.fallbackCount += 1;
        return json(res, 200, { mode: "fallback", selected_driver: null, reason: "no_driver" });
      }

      return json(res, 200, {
        mode: "ai",
        selected_driver: selected,
        decision_log: {
          strategy: body.strategy || "balanced",
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (req.method === "GET" && (path === "/ai/model-info" || path === "/model-info")) {
      return json(res, 200, {
        eta_model_version: "eta-v1",
        pricing_model_version: "pricing-v2",
        fraud_model_version: "fraud-v1",
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

  for (const driver of scoredDrivers) {
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
            }),
          },
        ],
      });
      return;
    }
  }
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

function startHttpServer() {
  const { server, protocol } = createServer((req, res) => {
    handleHttp(req, res);
  }, "ai-matching-service");
  server.listen(port, () => {
    console.log(`AI matching service running on ${protocol}://0.0.0.0:${port}`);
  });
}

startHttpServer();
startKafka().catch((err) => {
  console.error("AI matching kafka bootstrap failed:", err.message);
});
