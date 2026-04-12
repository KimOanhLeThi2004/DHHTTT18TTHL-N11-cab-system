const jwt = require("jsonwebtoken");
const { isAccessTokenRevoked } = require("../services/tokenStore");
require("dotenv").config();
module.exports = function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ message: "Missing token" });
  }

  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  if (!token) {
    return res.status(401).json({ message: "Invalid token format" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (isAccessTokenRevoked(token)) {
      return res.status(401).json({ message: "Token revoked" });
    }
    req.auth = decoded;
    req.rawToken = token;

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }
    return res.status(401).json({ message: "Invalid token" });
  }
};
