// middlewares/verifyServiceJwt.js
const jwt = require("jsonwebtoken");

module.exports = function verifyServiceJwt(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];
    const origin = req.headers["x-internal-origin"];

    if (!authHeader) {
      return res.status(401).json({ message: "Missing service token" });
    }

    const token = authHeader.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : null;
    if (!token) {
      return res.status(401).json({ message: "Invalid service token format" });
    }

    const secrets = [
      process.env.SERVICE_JWT_SECRET,
      process.env.INTERNAL_JWT_SECRET,
      "ride-service",
      "api-gateway",
    ].filter(Boolean);

    let payload;
    for (const secret of secrets) {
      try {
        payload = jwt.verify(token, secret);
        break;
      } catch (err) {
        payload = null;
      }
    }
    if (!payload) {
      return res.status(401).json({ message: "Invalid or expired service token" });
    }

    if (!payload.service) {
      return res.status(403).json({ message: "Invalid service token" });
    }

    req.internal = {
      service: payload.service,
      scope: payload.scope || [],
      origin: origin || "unknown",
    };

    next();
  } catch (err) {
    console.error("verifyServiceJwt error:", err.message);
    return res.status(401).json({ message: "Invalid or expired service token" });
  }
};
