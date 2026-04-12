const jwt = require("jsonwebtoken");
require("dotenv").config();

function signServiceToken() {
  const secret =
    process.env.INTERNAL_JWT_SECRET ||
    process.env.SERVICE_JWT_SECRET ||
    "api-gateway";

  return jwt.sign(
    {
      service: "api-gateway",
      scope: ["pricing:calculate", "ride:read", "metrics:read"],
      aud: "internal-services",
    },
    secret,
    { expiresIn: "5m" }
  );
}

module.exports = signServiceToken;
