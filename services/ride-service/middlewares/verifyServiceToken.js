const jwt = require("jsonwebtoken");
require('dotenv').config();
module.exports = function verifyServiceToken(req, res, next) {
  const auth = req.headers.authorization;

  if (!auth) {
    return res.status(401).json({ message: "Missing service token" });
  }

  const token = auth.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.INTERNAL_JWT_SECRET
    );


    // whitelist caller
    const allowed = ["api-gateway", "payment-service"];
    if (!allowed.includes(decoded.service)) {
      return res.status(403).json({ message: "Invalid service" });
    }

    req.service = {
      name: decoded.service,
      scope: decoded.scope
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid service token" });
  }
};
