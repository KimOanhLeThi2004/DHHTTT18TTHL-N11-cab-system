const WebSocket = require("ws");
const jwt = require("jsonwebtoken");

const clients = new Map();
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

function verifyAccessToken(token) {
  const secrets = [
    process.env.JWT_SECRET,
    process.env.JWT_SECRETKEY,
    process.env.ACCESS_JWT_SECRET,
  ].filter(Boolean);

  let payload = null;
  for (const secret of secrets) {
    try {
      payload = jwt.verify(token, secret);
      break;
    } catch (err) {
      payload = null;
    }
  }
  return payload;
}

function resolveAccessToken(req) {
  const url = new URL(req.url, "http://localhost:3008");
  const queryToken = url.searchParams.get("token");
  if (queryToken) return queryToken;

  const cookies = parseCookieHeader(req.headers.cookie);
  return cookies[ACCESS_COOKIE_NAME] || null;
}

const initWebSocket = (server) => {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", (ws, req) => {
    try {
      const token = resolveAccessToken(req);
      if (!token) {
        ws.close();
        return;
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        ws.close();
        return;
      }

      const userId = payload.userId || payload.sub;
      if (!userId) {
        ws.close();
        return;
      }

      clients.set(userId, ws);

      ws.on("close", () => {
        clients.delete(userId);
      });

    } catch (err) {
      ws.close();
    }
  });

  const sendToUser = (userId, payload) => {
    const ws = clients.get(userId);

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  };

  return { sendToUser };
};

module.exports = initWebSocket;
