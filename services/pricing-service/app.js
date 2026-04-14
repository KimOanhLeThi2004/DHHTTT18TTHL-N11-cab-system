const express = require('express');
const pricingRoutes = require('./routes/pricing.routes');
const verifyToken = require('./middlewares/verifyServiceToken');
const { startServer } = require("./mtls");
require("dotenv").config();

const app = express();
const metrics = { requests: 0, startedAt: Date.now() };
const port = Number(process.env.PORT || 3003);

app.use(express.json({ limit: process.env.PAYLOAD_LIMIT || "1mb" }));
app.use((req, _, next) => {
  metrics.requests += 1;
  next();
});

app.use('/pricing', verifyToken, pricingRoutes);
app.get("/health", (_, res) => {
  res.json({ status: "ok", service: "pricing-service" });
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

startServer(app, port, "pricing-service", ({ protocol }) => {
  console.log(`Pricing Service running on ${protocol}://0.0.0.0:${port}`);
});
