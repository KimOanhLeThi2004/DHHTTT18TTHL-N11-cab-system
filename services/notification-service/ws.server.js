const WebSocket = require("ws");
const jwt = require("jsonwebtoken");

const clients = new Map();
const ACCESS_COOKIE_NAME = process.env.ACCESS_COOKIE_NAME || "access_token";
const WS_AUTH_TIMEOUT_MS = Number(process.env.WS_AUTH_TIMEOUT_MS || 10000);

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

function resolveUserIdFromToken(token) {
  if (!token) return null;
  const payload = verifyAccessToken(token);
  return payload?.userId || payload?.sub || null;
}

const initWebSocket = (server) => {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", (ws, req) => {
    let authTimeout = null;

    const bindClient = (userId) => {
      const normalizedUserId = String(userId);
      if (ws.userId && clients.get(ws.userId) === ws) {
        clients.delete(ws.userId);
      }
      ws.userId = normalizedUserId;
      clients.set(normalizedUserId, ws);
      if (authTimeout) {
        clearTimeout(authTimeout);
        authTimeout = null;
      }
      return true;
    };

    const authenticate = (token) => {
      const userId = resolveUserIdFromToken(token);
      if (!userId) return false;
      return bindClient(userId);
    };

    try {
      const token = resolveAccessToken(req);
      if (token) {
        authenticate(token);
      }

      if (!ws.userId) {
        authTimeout = setTimeout(() => {
          if (!ws.userId && ws.readyState === WebSocket.OPEN) {
            ws.close(1008, "Missing or invalid auth token");
          }
        }, WS_AUTH_TIMEOUT_MS);
      }

      ws.on("message", (message) => {
        if (ws.userId) return;

        try {
          const parsed = JSON.parse(message.toString());
          if (parsed?.type !== "AUTH") {
            ws.send(JSON.stringify({ type: "AUTH_REQUIRED" }));
            return;
          }

          if (!authenticate(parsed.token)) {
            ws.send(JSON.stringify({ type: "AUTH_ERROR", message: "Invalid token" }));
            ws.close(1008, "Invalid auth token");
            return;
          }

          ws.send(JSON.stringify({ type: "AUTH_OK" }));
        } catch (_) {
          ws.close(1003, "Invalid message format");
        }
      });

      ws.on("close", () => {
        if (authTimeout) {
          clearTimeout(authTimeout);
          authTimeout = null;
        }
        if (ws.userId && clients.get(ws.userId) === ws) {
          clients.delete(ws.userId);
        }
      });

    } catch (err) {
      ws.close(1011, "WebSocket init failed");
    }
  });

  const sendToUser = (userId, payload) => {
    const ws = clients.get(String(userId));

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  };

  return { sendToUser };
};

module.exports = initWebSocket;
