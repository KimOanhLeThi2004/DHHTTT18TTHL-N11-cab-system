const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const { createProxyMiddleware, fixRequestBody } = require("http-proxy-middleware");
const { toInternalUrl, getHttpsAgent, isMtlsEnabled } = require("./mtls");
const authMiddleware = require("./middlewares/auth.middleware");
const signServiceToken = require("./middlewares/pricing.middleware");
const bookingRoute = require("./routes/booking.route");
const {
  PORT,
  AUTH_SERVICE_URL,
  USER_SERVICE_URL,
  PRICING_SERVICE_URL,
  DRIVER_SERVICE_URL,
  RIDE_SERVICE_URL,
  PAYMENT_SERVICE_URL,
  REVIEW_SERVICE_URL,
  NOTIFICATION_SERVICE_URL,
  AI_SERVICE_URL,
} = require("./config");

const app = express();
const metrics = {
  requests_total: 0,
  responses_2xx: 0,
  responses_4xx: 0,
  responses_5xx: 0,
  startedAt: Date.now(),
};

const healthRateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 1000);
const healthRateLimitMax = Number(process.env.RATE_LIMIT_MAX || 100);
const bookingRateLimitWindowMs = Number(process.env.BOOKING_RATE_LIMIT_WINDOW_MS || 1000);
const bookingRateLimitMax = Number(process.env.BOOKING_RATE_LIMIT_MAX || 80);
const healthBuckets = new Map();
const bookingBuckets = new Map();
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

function parseAllowedOrigins() {
  const rawEnvValue = stripOptionalQuotes(process.env.CORS_ORIGIN || "");
  const rawOrigins =
    rawEnvValue ||
    "http://localhost:5173,http://localhost:4173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:4173,http://127.0.0.1:3000";
  return rawOrigins
    .split(",")
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);
}

function stripOptionalQuotes(value = "") {
  const trimmed = String(value).trim();
  if (!trimmed) return "";

  const firstChar = trimmed[0];
  const lastChar = trimmed[trimmed.length - 1];
  const isWrappedInSameQuote =
    (firstChar === "'" && lastChar === "'") || (firstChar === '"' && lastChar === '"');
  return isWrappedInSameQuote ? trimmed.slice(1, -1).trim() : trimmed;
}

function normalizeOrigin(origin = "") {
  const value = stripOptionalQuotes(origin);
  if (!value) return "";
  if (value === "*") return "*";

  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "";
    }

    const defaultPort = parsed.protocol === "https:" ? "443" : "80";
    const normalizedPort = parsed.port && parsed.port !== defaultPort ? `:${parsed.port}` : "";
    return `${parsed.protocol}//${parsed.hostname}${normalizedPort}`.toLowerCase();
  } catch (_) {
    return value;
  }
}

function isLoopbackHost(hostname = "") {
  const value = String(hostname).trim().toLowerCase();
  return value === "localhost" || value === "127.0.0.1" || value === "::1" || value === "[::1]";
}

function isPrivateIpv4(hostname = "") {
  const value = String(hostname).trim().toLowerCase();
  if (!value) return false;
  if (isLoopbackHost(value)) return true;

  const parts = value.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  return false;
}

function isLanDevOrigin(origin = "") {
  try {
    const parsed = new URL(normalizeOrigin(origin));
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false;
    }

    const port = parsed.port || (parsed.protocol === "https:" ? "443" : "80");
    const allowedPorts = new Set(["3000", "4173", "5173"]);
    return allowedPorts.has(port) && isPrivateIpv4(parsed.hostname);
  } catch (_) {
    return false;
  }
}

function resolveAccessTokenFromCookie(req) {
  const cookies = parseCookieHeader(req.headers.cookie);
  return cookies[ACCESS_COOKIE_NAME] || null;
}

function toBearerToken(token) {
  if (!token) return null;
  if (token.startsWith("Bearer ")) return token;
  return `Bearer ${token}`;
}

function resolveClientIp(req) {
  return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || "unknown";
}

function enforceSlidingWindowRateLimit(req, res, {
  buckets,
  windowMs,
  max,
  errorMessage = "Too many requests",
}) {
  const ip = resolveClientIp(req);
  const now = Date.now();
  const bucket = buckets.get(ip);

  if (!bucket || now - bucket.windowStart >= windowMs) {
    buckets.set(ip, { windowStart: now, count: 1 });
    return false;
  }

  bucket.count += 1;
  if (bucket.count <= max) {
    return false;
  }

  const retryAfterSec = Math.max(1, Math.ceil(windowMs / 1000));
  res.setHeader("Retry-After", String(retryAfterSec));
  res.status(429).json({ message: errorMessage });
  return true;
}

function isOriginAllowed(origin = "", allowedOrigins = []) {
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return false;
  if (allowedOrigins.includes("*")) return true;
  return allowedOrigins.includes(normalizedOrigin);
}

function hasOnlyLoopbackOrigins(allowedOrigins = []) {
  const concreteOrigins = allowedOrigins.filter((origin) => origin && origin !== "*");
  if (!concreteOrigins.length) {
    return false;
  }

  return concreteOrigins.every((origin) => {
    try {
      const parsed = new URL(origin);
      return isLoopbackHost(parsed.hostname);
    } catch (_) {
      return false;
    }
  });
}

const allowedOrigins = parseAllowedOrigins();
const hasExplicitCorsOrigins = Boolean(stripOptionalQuotes(process.env.CORS_ORIGIN || ""));
const allowLanFallback = !hasExplicitCorsOrigins || hasOnlyLoopbackOrigins(allowedOrigins);
const corsOptions = {
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (isOriginAllowed(origin, allowedOrigins)) {
      callback(null, true);
      return;
    }

    // When CORS_ORIGIN is empty or accidentally loopback-only on VPS,
    // still allow same-LAN frontend origins to avoid login preflight failures.
    if (allowLanFallback && isLanDevOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Not allowed by CORS"));
  },
};
app.use(
  cors(corsOptions)
);
app.use(express.json({ limit: process.env.PAYLOAD_LIMIT || "1mb" }));

app.use((req, res, next) => {
  metrics.requests_total += 1;
  req.requestId = req.headers["x-request-id"] || crypto.randomUUID();
  res.setHeader("x-request-id", req.requestId);
  res.on("finish", () => {
    if (res.statusCode >= 500) metrics.responses_5xx += 1;
    else if (res.statusCode >= 400) metrics.responses_4xx += 1;
    else metrics.responses_2xx += 1;
  });
  next();
});

app.use((req, res, next) => {
  // Keep load-shedding checks on health probes without starving business APIs.
  if (req.path !== "/health") {
    return next();
  }
  const blocked = enforceSlidingWindowRateLimit(req, res, {
    buckets: healthBuckets,
    windowMs: healthRateLimitWindowMs,
    max: healthRateLimitMax,
    errorMessage: "Too many requests",
  });
  if (blocked) {
    return;
  }
  next();
});

app.use((req, res, next) => {
  if (req.method !== "POST" || !req.path.startsWith("/booking")) {
    return next();
  }
  const blocked = enforceSlidingWindowRateLimit(req, res, {
    buckets: bookingBuckets,
    windowMs: bookingRateLimitWindowMs,
    max: bookingRateLimitMax,
    errorMessage: "Too many booking requests",
  });
  if (blocked) {
    return;
  }
  next();
});

const withServiceToken = () => `Bearer ${signServiceToken()}`;

const proxyTo = (target, options = {}) => {
  const proxyConfig = {
    target: toInternalUrl(target),
    changeOrigin: true,
    ws: options.ws === true,
    pathRewrite: options.stripPrefix
      ? (path) => {
          if (!path.startsWith(options.stripPrefix)) {
            return path;
          }
          const rewritten = path.slice(options.stripPrefix.length);
          return rewritten.startsWith("/") ? rewritten : rewritten || "/";
        }
      : undefined,
    onProxyReq: (proxyReq, req) => {
      proxyReq.setHeader("x-request-id", req.requestId);

      if (options.serviceToken) {
        proxyReq.setHeader("Authorization", withServiceToken());
      } else {
        const resolvedAuth =
          req.headers.authorization || toBearerToken(resolveAccessTokenFromCookie(req));
        if (resolvedAuth) {
          proxyReq.setHeader("Authorization", resolvedAuth);
        }
      }

      // Keep body forwarding consistent across proxied methods.
      fixRequestBody(proxyReq, req);
    },
    onError: (err, req, resOrSocket) => {
      const isWebSocketUpgrade =
        String(req?.headers?.upgrade || "").toLowerCase() === "websocket";
      const requestPath = req?.originalUrl || req?.url || "unknown";
      const errorCode = err?.code || "UNKNOWN";
      const errorMessage = err?.message || "proxy_error";

      console.error(
        `[proxy:error] target=${target} path=${requestPath} code=${errorCode} message=${errorMessage}`
      );

      if (isWebSocketUpgrade) {
        if (resOrSocket && typeof resOrSocket.destroy === "function") {
          resOrSocket.destroy();
        }
        return;
      }

      if (resOrSocket && typeof resOrSocket.status === "function" && typeof resOrSocket.json === "function") {
        resOrSocket.status(503).json({ message: "Upstream service unavailable" });
        return;
      }

      if (resOrSocket && typeof resOrSocket.writeHead === "function" && typeof resOrSocket.end === "function") {
        resOrSocket.writeHead(503, { "Content-Type": "application/json" });
        resOrSocket.end(JSON.stringify({ message: "Upstream service unavailable" }));
      }
    },
  };

  if (isMtlsEnabled()) {
    proxyConfig.agent = getHttpsAgent("api-gateway");
    proxyConfig.secure = process.env.MTLS_REJECT_UNAUTHORIZED !== "false";
  }

  return createProxyMiddleware(proxyConfig);
};

// Custom booking flow (pricing + booking)
app.use("/booking", authMiddleware, bookingRoute);

// Proxy routes
const driverWsProxy = proxyTo(DRIVER_SERVICE_URL, { stripPrefix: "/ws/drivers", ws: true });
const notificationWsProxy = proxyTo(NOTIFICATION_SERVICE_URL, {
  stripPrefix: "/ws/notifications",
  ws: true,
});

app.use("/ws/drivers", driverWsProxy);
app.use("/ws/notifications", notificationWsProxy);
app.use("/auth", proxyTo(AUTH_SERVICE_URL));
app.use("/users", proxyTo(USER_SERVICE_URL));
app.use("/drivers", proxyTo(DRIVER_SERVICE_URL));
app.use("/pricing", proxyTo(PRICING_SERVICE_URL, { serviceToken: true }));
app.use("/rides", proxyTo(RIDE_SERVICE_URL, { serviceToken: true }));
app.use("/payments", authMiddleware, proxyTo(PAYMENT_SERVICE_URL));
app.use("/reviews", authMiddleware, proxyTo(REVIEW_SERVICE_URL));
app.use("/notifications", authMiddleware, proxyTo(NOTIFICATION_SERVICE_URL));
app.use("/ai", proxyTo(AI_SERVICE_URL, { stripPrefix: "/ai" }));

app.get("/health", (_, res) => {
  res.json({ status: "ok", service: "api-gateway" });
});

app.get("/metrics", (_, res) => {
  const uptimeMs = Date.now() - metrics.startedAt;
  res.type("text/plain").send(
    [
      `requests_total ${metrics.requests_total}`,
      `responses_2xx ${metrics.responses_2xx}`,
      `responses_4xx ${metrics.responses_4xx}`,
      `responses_5xx ${metrics.responses_5xx}`,
      `uptime_ms ${uptimeMs}`,
    ].join("\n")
  );
});

app.use((err, _, res, __) => {
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ message: "Payload Too Large" });
  }
  return res.status(500).json({ message: "Internal server error" });
});

const server = app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});

server.on("upgrade", (req, socket, head) => {
  const requestUrl = req.url || "";

  if (requestUrl.startsWith("/ws/drivers")) {
    if (typeof driverWsProxy.upgrade === "function") {
      driverWsProxy.upgrade(req, socket, head);
      return;
    }
    socket.destroy();
    return;
  }

  if (requestUrl.startsWith("/ws/notifications")) {
    if (typeof notificationWsProxy.upgrade === "function") {
      notificationWsProxy.upgrade(req, socket, head);
      return;
    }
    socket.destroy();
    return;
  }

  socket.destroy();
});
