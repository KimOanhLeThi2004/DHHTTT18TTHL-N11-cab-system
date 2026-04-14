const express = require('express');
const { sequelize } = require('./models');
const authRoutes = require('./routes/auth.route');
const { startServer } = require("./mtls");
require('dotenv').config();

const app = express();
const metrics = { requests: 0, startedAt: Date.now() };
app.use(express.json({ limit: process.env.PAYLOAD_LIMIT || "1mb" }));
app.use((req, _, next) => {
  metrics.requests += 1;
  next();
});

app.use('/auth', authRoutes);
app.get("/health", (_, res) => {
  res.json({ status: "ok", service: "auth-service" });
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

sequelize
  .sync({ alter: true })
  .then(() => {
    console.log('Auth DB connected');
    startServer(app, process.env.PORT, "auth-service", ({ protocol, port }) => {
      console.log(`Auth Service running on ${protocol}://0.0.0.0:${port}`);
    });
  })
  .catch((err) => console.error(err));
