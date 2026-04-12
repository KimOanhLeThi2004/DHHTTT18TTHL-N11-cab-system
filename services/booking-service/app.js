require('dotenv').config();
const express = require('express');
const connectMongo = require('./config/mongo');
const bookingRoutes = require('./routes/booking.routes');
const token = require("./middlewares/auth.middleware");
const start = require('./driverAssignedConsumer');

const app = express();
const metrics = {
  requests: 0,
  startedAt: Date.now(),
};
app.use(express.json({ limit: process.env.PAYLOAD_LIMIT || "1mb" }));
app.use((req, _, next) => {
  metrics.requests += 1;
  next();
});

app.use('/bookings', token, bookingRoutes);
app.get("/health", (_, res) => {
  res.json({ status: "ok", service: "booking-service" });
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

connectMongo().then(() => {
  app.listen(process.env.PORT, () => {
    console.log(`Booking Service running on ${process.env.PORT}`);
  });
});

start().catch((err) => {
  console.error("Driver accepted consumer failed:", err.message);
});
