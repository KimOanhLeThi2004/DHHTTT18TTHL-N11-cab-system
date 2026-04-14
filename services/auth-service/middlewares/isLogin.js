const jwt = require("jsonwebtoken");
const { isAccessTokenRevoked } = require("../services/tokenStore");
require("dotenv").config();

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
  const authHeader = req.headers["authorization"];
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

module.exports = function verifyToken(req, res, next) {
  const token = resolveAccessToken(req);
  if (!token) {
    return res.status(401).json({ message: "Missing token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (isAccessTokenRevoked(token)) {
      return res.status(401).json({ message: "Token revoked" });
    }
    req.auth = decoded;
    req.rawToken = token;
    req.headers.authorization = `Bearer ${token}`;

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }
    return res.status(401).json({ message: "Invalid token" });
  }
};
