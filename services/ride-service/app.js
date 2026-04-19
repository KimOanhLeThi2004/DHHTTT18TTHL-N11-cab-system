const express = require("express");
const rideRoutes = require("./routes/ride.routes");
const { connectMongo } = require("./db/mongo");
const { initProducer } = require("./kafka/producer");
const startBookingConfirmedConsumer = require("./kafka/bookingConfirmed.consumer");
const { startServer } = require("./mtls");
require("dotenv").config();

const app = express();
const metrics = { requests: 0, startedAt: Date.now() };
const KAFKA_BOOTSTRAP_RETRY_MS = Math.max(
  1000,
  Number(process.env.KAFKA_BOOTSTRAP_RETRY_MS || 5000)
);

app.use(express.json({ limit: process.env.PAYLOAD_LIMIT || "1mb" }));
app.use((req, _, next) => {
  metrics.requests += 1;
  next();
});

app.use("/rides", rideRoutes);
app.get("/health", (_, res) => {
  res.json({ status: "ok", service: "ride-service" });
});
app.get("/metrics", (_, res) => {
  res.type("text/plain").send(
    [
      `request_count ${metrics.requests}`,
      `uptime_ms ${Date.now() - metrics.startedAt}`,
    ].join("\n")
  );
});
app.use((err, _, res, __) => {
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ message: "Payload Too Large" });
  }
  return res.status(500).json({ message: "Internal server error" });
});

async function bootstrapConsumer() {
  await startBookingConfirmedConsumer();
  console.log("Ride consumer started");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function bootstrapConsumerWithRetry() {
  while (true) {
    try {
      await bootstrapConsumer();
      return;
    } catch (err) {
      console.error("Ride consumer bootstrap failed:", err.message);
      console.log(`Retrying ride consumer bootstrap in ${KAFKA_BOOTSTRAP_RETRY_MS}ms`);
      await sleep(KAFKA_BOOTSTRAP_RETRY_MS);
    }
  }
}

async function bootstrapProducerWithRetry() {
  while (true) {
    try {
      await initProducer();
      return;
    } catch (err) {
      console.error("Ride producer bootstrap failed:", err.message);
      console.log(`Retrying ride producer bootstrap in ${KAFKA_BOOTSTRAP_RETRY_MS}ms`);
      await sleep(KAFKA_BOOTSTRAP_RETRY_MS);
    }
  }
}

(async () => {
  try {
    await connectMongo();

    startServer(app, process.env.PORT, "ride-service", ({ protocol, port }) => {
      console.log(`Ride Service running on ${protocol}://0.0.0.0:${port}`);
    });

    // Keep HTTP API alive even if Kafka is temporarily unavailable.
    bootstrapProducerWithRetry();
    bootstrapConsumerWithRetry();
  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
})();
