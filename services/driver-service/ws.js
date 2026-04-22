const WebSocket = require("ws");
const jwt = require("jsonwebtoken");
const { redis } = require("./db/redis");
const { registerDriverSocket, removeDriverSocket } = require("./websocketGateway");
const { setDriverOnline, setDriverOffline } = require("./services/driver.service");
const { publishDriverLocation } = require("./services/eventProducer");

const ACCESS_COOKIE_NAME = process.env.ACCESS_COOKIE_NAME || "access_token";

function parseCookieHeader(cookieHeader = "") {
  if (!cookieHeader || typeof cookieHeader !== "string") {
    return {};
  }

  return cookieHeader.split(";").reduce((acc, pair) => {
    const [rawKey, ...rest] = pair.split("=");
    const key = rawKey ? rawKey.trim() : "";
    if (!key) return acc;
    const rawValue = rest.join("=").trim();
    try {
      acc[key] = decodeURIComponent(rawValue);
    } catch (_) {
      acc[key] = rawValue;
    }
    return acc;
  }, {});
}

function verifyDriverToken(token) {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload?.role && payload.role !== "DRIVER") {
      return null;
    }
    return payload;
  } catch (_) {
    return null;
  }
}

function resolveDriverIdFromCookie(req) {
  const cookies = parseCookieHeader(req.headers.cookie);
  const token = cookies[ACCESS_COOKIE_NAME];
  if (!token) return null;
  const payload = verifyDriverToken(token);
  return payload?.userId || payload?.sub || null;
}

function setupDriverWS(server) {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", (ws, req) => {
    console.log("Driver WS connected");
    const cookieDriverId = resolveDriverIdFromCookie(req);
    if (cookieDriverId) {
      ws.driverId = String(cookieDriverId);
      registerDriverSocket(ws.driverId, ws);
    }

    ws.on("error", (err) => {
      console.error("WS error:", err.message);
    });

    ws.on("message", async (msg) => {
      try {
        const data = JSON.parse(msg.toString());

        if (data.type === "AUTH") {
          const payload = verifyDriverToken(data.token);
          if (payload?.userId || payload?.sub) {
            const nextDriverId = String(payload.userId || payload.sub);
            if (ws.driverId && ws.driverId !== nextDriverId) {
              removeDriverSocket(ws.driverId, ws);
            }
            ws.driverId = nextDriverId;
            registerDriverSocket(ws.driverId, ws);
            return;
          }
          ws.send(JSON.stringify({ error: "Invalid token" }));
          return;
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
      removeDriverSocket(ws.driverId, ws);
    });
  });
}

module.exports = setupDriverWS;
