const { introspectToken } = require("../services/auth.service");

module.exports = async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: "Missing token" });
    }

    const result = await introspectToken(authHeader);
    if (!result.active) {
      return res.status(401).json({ message: result.reason || "Invalid token" });
    }

    req.user = result.user || null;
    next();
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ message: err.message || "Unauthorized" });
    }
    console.error("Auth error:", err.message);
    return res.status(401).json({ message: "Unauthorized" });
  }
};
