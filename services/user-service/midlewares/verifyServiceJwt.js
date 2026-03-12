// middlewares/verifyServiceJwt.js
const jwt = require("jsonwebtoken");

module.exports = function verifyServiceJwt(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];
    const origin = req.headers["x-internal-origin"];

    if (!authHeader) {
      return res.status(401).json({ message: "Missing service token" });
    }

    const token = authHeader.replace("Bearer ", "");

    const payload = jwt.verify(token, process.env.SERVICE_JWT_SECRET);
    console.log(payload)
    if (!payload.service) {
      return res.status(403).json({ message: "Invalid service token" });
    }

    // (Optional) Check scope nếu bạn muốn strict hơn
    // if (!payload.scope?.includes("internal:user.read")) { ... }

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
