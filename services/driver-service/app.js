const express = require("express");
const driverRoutes = require("./routes/driver.routes");
const { sequelize } = require("./db/postgres");
require("dotenv").config();
const startAssignmentConsumer = require('./services/assignmentConsumer')
const setupDriverWS = require("./ws"); 
const http = require("http");


const app = express();
const metrics = { requests: 0, startedAt: Date.now() };
app.use(express.json({ limit: process.env.PAYLOAD_LIMIT || "1mb" }));
app.use((req, _, next) => {
  metrics.requests += 1;
  next();
});

app.use("/drivers", driverRoutes);
app.get("/health", (_, res) => {
  res.json({ status: "ok", service: "driver-service" });
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
startAssignmentConsumer();
(async () => {
  try {
    await sequelize.sync();
    console.log("Postgres connected");

    const server = http.createServer(app);

    // 👇 gắn websocket
    setupDriverWS(server);

    server.listen(process.env.PORT, () => {
      console.log(`Driver Service running on port ${process.env.PORT}`);
      console.log(`Driver WS running on ws://localhost:${process.env.PORT}`);
    });
  } catch (err) {
    console.error("Startup error:", err);
  }
})();
