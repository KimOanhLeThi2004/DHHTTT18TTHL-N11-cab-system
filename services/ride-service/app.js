const express = require("express");
const rideRoutes = require("./routes/ride.routes");
const { connectMongo } = require("./db/mongo");
const { initProducer } = require("./kafka/producer");
const startBookingConfirmedConsumer = require("./kafka/bookingConfirmed.consumer");
require("dotenv").config();

const app = express();
const metrics = { requests: 0, startedAt: Date.now() };

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

bootstrapConsumer().catch((err) => {
  console.error("Ride consumer bootstrap failed:", err.message);
});

(async () => {
  try {
    await connectMongo();
    await initProducer();

    app.listen(process.env.PORT, () => {
      console.log(`Ride Service running on port ${process.env.PORT}`);
    });
  } catch (err) {
    console.error("Startup error:", err);
  }
})();
