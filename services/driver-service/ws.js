// ws.js (driver-service backend)
const WebSocket = require("ws");
const jwt = require("jsonwebtoken");
const { registerDriverSocket, removeDriverSocket } = require("./websocketGateway");
const { setDriverOnline, setDriverOffline } = require("./services/driver.service"); // 👈 thêm dòng này

function setupDriverWS(server) {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", (ws) => {
    console.log("Driver WS connected");

    ws.on("error", (e) => {
      console.error("WS error:", e.message);
    });

    ws.on("message", async (msg) => {
      try {
        const data = JSON.parse(msg.toString());
        console.log("WS received:", data);

        if (data.type === "AUTH") {
          try {
            const payload = jwt.verify(data.token, process.env.JWT_SECRET);
            ws.driverId = payload.userId;
            registerDriverSocket(ws.driverId, ws);
            return;
          } catch (e) {
            console.log("JWT verify fail:", e.message);
            ws.send(JSON.stringify({ error: "Invalid token" }));
            return;
          }
        }

        if (!ws.driverId) {
          ws.send(JSON.stringify({ error: "Unauthenticated" }));
          return;
        }

        // ✅ GPS UPDATE → Redis GEO
        if (data.type === "GPS_UPDATE") {
          const { lat, lng, vehicleType } = data;

          await setDriverOnline(ws.driverId, lat, lng, vehicleType);

          console.log("GPS saved to redis:", ws.driverId, lat, lng, vehicleType);
        }

        // ✅ OFFLINE → remove khỏi redis
        if (data.type === "OFFLINE") {
          await setDriverOffline(ws.driverId);
          console.log("Driver offline:", ws.driverId);
        }

        if (data.type === "ACCEPT_RIDE") {
          console.log("Driver accepted:", data.bookingId);
          // TODO: emit Kafka event driver.accepted
        }

        if (data.type === "REJECT_RIDE") {
          console.log("Driver rejected:", data.bookingId);
          // TODO: emit Kafka event driver.rejected
        }
      } catch (e) {
        console.error("WS error:", e.message);
      }
    });

    ws.on("close", async () => {
      if (ws.driverId) {
        await setDriverOffline(ws.driverId); // 👈 đảm bảo tắt WS là offline
        removeDriverSocket(ws.driverId);
        console.log("Driver disconnected:", ws.driverId);
      }
    });
  });
}

module.exports = setupDriverWS;