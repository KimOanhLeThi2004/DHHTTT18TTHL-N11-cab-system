const jwt = require("jsonwebtoken");
require('dotenv').config();

function signServiceToken() {
  return jwt.sign(
    {
      service: "api-gateway",
      scope: ["pricing:calculate"]
    },
    process.env.INTERNAL_JWT_SECRET,
    { expiresIn: "5m" }
  );
}

module.exports = signServiceToken;
