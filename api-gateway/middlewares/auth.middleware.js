const { introspectToken } = require("../services/auth.service");

module.exports = async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: "Missing token" });
    }

    const result = await introspectToken(authHeader);
    if (!result.message) {
      return res.status(401).json({ message: "Invalid token" });
    }

    // Inject identity

    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    res.status(401).json({ message: "Unauthorized" });
  }
};
