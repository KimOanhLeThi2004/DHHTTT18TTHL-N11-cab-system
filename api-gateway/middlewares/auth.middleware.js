const { introspectToken } = require("../services/auth.service");

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

function resolveAccessToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    if (authHeader.startsWith("Bearer ")) {
      return authHeader.split(" ")[1];
    }
    const normalized = authHeader.trim();
    if (normalized) return normalized;
  }

  const cookies = parseCookieHeader(req.headers.cookie);
  return cookies[ACCESS_COOKIE_NAME] || null;
}

module.exports = async function authMiddleware(req, res, next) {
  try {
    const token = resolveAccessToken(req);
    if (!token) {
      return res.status(401).json({ message: "Missing token" });
    }

    const authHeader = `Bearer ${token}`;
    const result = await introspectToken(authHeader);
    if (!result.active) {
      return res.status(401).json({ message: result.reason || "Invalid token" });
    }

    req.user = result.user || null;
    req.headers.authorization = authHeader;
    next();
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ message: err.message || "Unauthorized" });
    }
    console.error("Auth error:", err.message);
    return res.status(401).json({ message: "Unauthorized" });
  }
};
