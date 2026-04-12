const jwt = require("jsonwebtoken");
require("dotenv").config();

function verifyAccessToken(token) {
  const secrets = [
    process.env.JWT_SECRET,
    process.env.JWT_SECRETKEY,
    process.env.ACCESS_JWT_SECRET,
  ].filter(Boolean);

  let decoded = null;
  for (const secret of secrets) {
    try {
      decoded = jwt.verify(token, secret);
      break;
    } catch (err) {
      decoded = null;
    }
  }

  if (!decoded) {
    throw new Error("INVALID_TOKEN");
  }
  return decoded;
}

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
    const decoded = verifyAccessToken(token);

    // attach identity to request
    req.user = {
      id: decoded.userId || decoded.sub
    };


    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }
    return res.status(401).json({ message: "Invalid token" });
  }
};
