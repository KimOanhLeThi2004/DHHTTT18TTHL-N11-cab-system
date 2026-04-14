require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const startConsumer = require("./kafka/consumer");
const initWebSocket = require("./ws.server");
const { createServer } = require("./mtls");

const app = express();
const metrics = { requests: 0, startedAt: Date.now() };
app.use(express.json({ limit: process.env.PAYLOAD_LIMIT || "1mb" }));
app.use((req, _, next) => {
  metrics.requests += 1;
  next();
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

app.use("/notifications", require("./routes/notification.routes"));
app.get("/health", (_, res) => {
  res.json({ status: "ok", service: "notification-service" });
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

const { server, protocol } = createServer(app, "notification-service");
const wsProtocol = protocol === "https" ? "wss" : "ws";

const { sendToUser } = initWebSocket(server);
startConsumer(sendToUser).catch(console.error);

server.listen(process.env.PORT, () => {
  console.log(`Notification Service running on ${protocol}://0.0.0.0:${process.env.PORT}`);
  console.log(`Notification WS running on ${wsProtocol}://localhost:${process.env.PORT}`);
});
