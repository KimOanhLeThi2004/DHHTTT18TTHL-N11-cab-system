const jwt = require("jsonwebtoken");
require("dotenv").config();
module.exports = function verifyServiceToken(req, res, next) {
  const auth = req.headers.authorization;

  if (!auth) {
    return res.status(401).json({ message: "Missing service token" });
  }

  const token = auth.startsWith("Bearer ") ? auth.split(" ")[1] : null;
  if (!token) {
    return res.status(401).json({ message: "Invalid service token format" });
  }

  const secrets = [
    process.env.INTERNAL_JWT_SECRET,
    process.env.SERVICE_JWT_SECRET,
    "api-gateway",
    "ride-service",
  ].filter(Boolean);

  try {
    let decoded;
    for (const secret of secrets) {
      try {
        decoded = jwt.verify(token, secret);
        break;
      } catch (err) {
        decoded = null;
      }
    }
    if (!decoded) {
      return res.status(401).json({ message: "Invalid service token" });
    }

    const allowed = ["api-gateway", "payment-service"];
    if (!allowed.includes(decoded.service)) {
      return res.status(403).json({ message: "Access denied" });
    }

    req.service = {
      name: decoded.service,
      scope: decoded.scope || [],
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid service token" });
  }
};
