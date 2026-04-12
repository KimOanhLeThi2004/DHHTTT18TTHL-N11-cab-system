// middlewares/signServiceJwt.js
const jwt = require("jsonwebtoken");

module.exports = function signServiceJwt(options = {}) {
  const {
    service = process.env.SERVICE_NAME || "unknown-service",
    aud,                // service đích (user-service, driver-service...)
    scope = [],         // quyền nội bộ
    expiresIn = "5m",   // token nội bộ ngắn hạn
  } = options;

  const secret = process.env.SERVICE_JWT_SECRET || process.env.INTERNAL_JWT_SECRET;

  if (!secret) {
    throw new Error("Missing SERVICE_JWT_SECRET");
  }

  return jwt.sign(
    {
      service, // bắt buộc để verifyServiceJwt check
      aud,
      scope,
    },
    secret,
    { expiresIn }
  );
};
