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

const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 1000);
const rateLimitMax = Number(process.env.RATE_LIMIT_MAX || 100);
const ipBuckets = new Map();
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
  const rawOrigins = process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:4173,http://localhost:3000";
  return rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
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

const allowedOrigins = parseAllowedOrigins();
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
  })
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

  const ip = req.ip || req.connection.remoteAddress || "unknown";
  const now = Date.now();
  const bucket = ipBuckets.get(ip);

  if (!bucket || now - bucket.windowStart >= rateLimitWindowMs) {
    ipBuckets.set(ip, { windowStart: now, count: 1 });
    return next();
  }

  bucket.count += 1;
  if (bucket.count > rateLimitMax) {
    // Reset bucket after throttling so subsequent probes can recover quickly.
    ipBuckets.set(ip, { windowStart: now, count: 0 });
    return res.status(429).json({ message: "Too many requests" });
  }
  return next();
});

const withServiceToken = () => `Bearer ${signServiceToken()}`;

const proxyTo = (target, options = {}) => {
  const proxyConfig = {
    target: toInternalUrl(target),
    changeOrigin: true,
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
    onError: (_, __, res) => {
      res.status(503).json({ message: "Upstream service unavailable" });
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

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
