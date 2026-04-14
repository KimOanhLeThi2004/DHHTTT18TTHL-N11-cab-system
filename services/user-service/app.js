const express = require('express');
const { sequelize } = require('./models');
const userRoutes = require('./routes/user.route');
const { startServer } = require("./mtls");
// const midldeware = require('./midlewares/auth.middleware')
require('dotenv').config();

const app = express();
const metrics = { requests: 0, startedAt: Date.now() };
app.use(express.json({ limit: process.env.PAYLOAD_LIMIT || "1mb" }));
app.use((req, _, next) => {
  metrics.requests += 1;
  next();
});

app.use('/users' ,userRoutes);
app.get("/health", (_, res) => {
  res.json({ status: "ok", service: "user-service" });
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
  .sync({alter: true})
  .then(() => {
    console.log('User DB connected');
    startServer(app, process.env.PORT, "user-service", ({ protocol, port }) => {
      console.log(`User Service running on ${protocol}://0.0.0.0:${port}`);
    });
  })
  .catch((err) => console.error(err));
