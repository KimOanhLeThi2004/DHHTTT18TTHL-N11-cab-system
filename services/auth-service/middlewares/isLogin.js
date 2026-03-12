const jwt = require("jsonwebtoken");
require('dotenv').config();
module.exports = function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ message: "Missing Authorization header" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Invalid token format" });
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET);

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
