const WebSocket = require("ws");
const jwt = require("jsonwebtoken");
const { redis } = require("./db/redis");
const { registerDriverSocket, removeDriverSocket } = require("./websocketGateway");
const { setDriverOnline, setDriverOffline } = require("./services/driver.service");
const { publishDriverLocation } = require("./services/eventProducer");

function setupDriverWS(server) {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", (ws) => {
    console.log("Driver WS connected");

    ws.on("error", (err) => {
      console.error("WS error:", err.message);
    });

    ws.on("message", async (msg) => {
      try {
        const data = JSON.parse(msg.toString());

        if (data.type === "AUTH") {
          try {
            const payload = jwt.verify(data.token, process.env.JWT_SECRET);
            ws.driverId = payload.userId;
            registerDriverSocket(ws.driverId, ws);
            return;
          } catch (err) {
            ws.send(JSON.stringify({ error: "Invalid token" }));
            return;
          }
        }

        if (!ws.driverId) {
          ws.send(JSON.stringify({ error: "Unauthenticated" }));
          return;
        }

        if (data.type === "GPS_UPDATE") {
          const { lat, lng, vehicleType } = data;
          await setDriverOnline(ws.driverId, lat, lng, vehicleType);

          const activeAssignmentRaw = await redis.get(`active_assignment:${ws.driverId}`);
          if (activeAssignmentRaw) {
            const activeAssignment = JSON.parse(activeAssignmentRaw);
            if (activeAssignment?.bookingId && activeAssignment?.userId) {
              await publishDriverLocation({
                bookingId: activeAssignment.bookingId,
                userId: activeAssignment.userId,
                driverId: ws.driverId,
                lat,
                lng,
                heading: data.heading ?? null,
                speedKph: data.speedKph ?? null,
              });
            }
          }
          return;
        }

        if (data.type === "OFFLINE") {
          await setDriverOffline(ws.driverId);
          await redis.del(`active_assignment:${ws.driverId}`);
          return;
        }

        if (data.type === "CLEAR_ASSIGNMENT") {
          await redis.del(`active_assignment:${ws.driverId}`);
          return;
        }
      } catch (err) {
        console.error("WS error:", err.message);
      }
    });

    ws.on("close", async () => {
      if (!ws.driverId) {
        return;
      }

      await setDriverOffline(ws.driverId);
      await redis.del(`active_assignment:${ws.driverId}`);
      removeDriverSocket(ws.driverId);
    });
  });
}

module.exports = setupDriverWS;
