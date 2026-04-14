const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const axios = require("../http-client");
const crypto = require("crypto");
const { Credential, RefreshToken } = require("../models");
const signServiceJwt = require("../middlewares/signServiceJwt");
const { revokeAccessToken } = require("../services/tokenStore");
require("dotenv").config();

const ACCESS_COOKIE_NAME = process.env.ACCESS_COOKIE_NAME || "access_token";
const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || "refresh_token";

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function parseBool(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function parseCookieHeader(cookieHeader = "") {
  if (!cookieHeader || typeof cookieHeader !== "string") {
    return {};
  }

  return cookieHeader.split(";").reduce((acc, pair) => {
    const [rawKey, ...rest] = pair.split("=");
    const key = rawKey ? rawKey.trim() : "";
    if (!key) return acc;
    const rawValue = rest.join("=").trim();
    try {
      acc[key] = decodeURIComponent(rawValue);
    } catch (_) {
      acc[key] = rawValue;
    }
    return acc;
  }, {});
}

function parseDurationToMs(rawValue, fallbackMs) {
  if (!rawValue || typeof rawValue !== "string") {
    return fallbackMs;
  }

  const text = rawValue.trim();
  if (!text) return fallbackMs;

  const numeric = Number(text);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric;
  }

  const match = text.match(/^(\d+)\s*([smhd])$/i);
  if (!match) return fallbackMs;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const unitMap = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return amount * unitMap[unit];
}

function resolveSameSite() {
  const raw = String(process.env.AUTH_COOKIE_SAMESITE || "Lax").trim().toLowerCase();
  if (raw === "strict") return "Strict";
  if (raw === "none") return "None";
  return "Lax";
}

function buildCookieOptions(maxAge) {
  const sameSite = resolveSameSite();
  const secure = parseBool(process.env.AUTH_COOKIE_SECURE, true) || sameSite === "None";
  const options = {
    httpOnly: true,
    secure,
    sameSite,
    path: process.env.AUTH_COOKIE_PATH || "/",
    maxAge,
  };

  const domain = process.env.AUTH_COOKIE_DOMAIN;
  if (domain) {
    options.domain = domain;
  }
  return options;
}

function buildClearCookieOptions() {
  const sameSite = resolveSameSite();
  const secure = parseBool(process.env.AUTH_COOKIE_SECURE, true) || sameSite === "None";
  const options = {
    httpOnly: true,
    secure,
    sameSite,
    path: process.env.AUTH_COOKIE_PATH || "/",
  };

  const domain = process.env.AUTH_COOKIE_DOMAIN;
  if (domain) {
    options.domain = domain;
  }
  return options;
}

function resolveAccessToken(req) {
  const authHeader = req.headers.authorization;
  const cookies = parseCookieHeader(req.headers.cookie);
  const cookieToken = cookies[ACCESS_COOKIE_NAME] || null;
  const bodyToken = req.body?.accessToken || null;

  if (bodyToken) return bodyToken;
  if (!authHeader) return cookieToken;
  if (authHeader.startsWith("Bearer ")) return authHeader.split(" ")[1];
  return authHeader.trim() || cookieToken;
}

function resolveRefreshToken(req) {
  const { refreshToken, refresh_token } = req.body || {};
  if (refreshToken || refresh_token) {
    return refreshToken || refresh_token;
  }
  const cookies = parseCookieHeader(req.headers.cookie);
  return cookies[REFRESH_COOKIE_NAME] || null;
}

async function createProfileByRole({ role, userId, email, name, phone, vehicleType }) {
  if (role === "CUSTOMER") {
    const serviceToken = signServiceJwt({
      service: "auth-service",
      aud: "user-service",
      scope: ["user.create"],
    });

    const { data } = await axios.post(
      `${process.env.USER_SERVICE_URL}/users`,
      { id: userId, email, name, phone },
      { headers: { Authorization: `Bearer ${serviceToken}` }, timeout: 7000 }
    );
    return data.id;
  }

  const serviceToken = signServiceJwt({
    service: "auth-service",
    aud: "driver-service",
    scope: ["driver.create"],
  });
  const { data } = await axios.post(
    `${process.env.DRIVER_SERVICE_URL}/drivers`,
    { id: userId, name, phone, vehicleType },
    { headers: { Authorization: `Bearer ${serviceToken}` }, timeout: 7000 }
  );
  return data.id;
}

exports.register = async (req, res) => {
  try {
    const {
      email,
      password,
      role = "CUSTOMER",
      name = "Unknown",
      phone = "",
      vehicleType = "CAR",
    } = req.body;

    if (!email || !password) {
      throw httpError(400, "email and password are required");
    }
    if (!["CUSTOMER", "DRIVER", "ADMIN"].includes(role)) {
      throw httpError(400, "Invalid role");
    }

    const existed = await Credential.findOne({ where: { email } });
    if (existed) {
      throw httpError(400, "Email already exists");
    }

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    const profileId =
      role === "ADMIN"
        ? userId
        : await createProfileByRole({ role, userId, email, name, phone, vehicleType });

    await Credential.create({
      email,
      passwordHash,
      role,
      userId: profileId,
    });

    return res.status(201).json({
      message: "Register successful",
      user_id: profileId,
      email,
      role,
    });
  } catch (err) {
    console.error("Register error:", err.message);
    return res.status(err.status || 500).json({ message: err.message || "Register failed" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      throw httpError(400, "email and password are required");
    }

    const credential = await Credential.findOne({ where: { email } });
    if (!credential || !credential.isActive) {
      throw httpError(404, "Account not found");
    }

    if (role && credential.role !== role) {
      throw httpError(401, "Role mismatch");
    }

    const isMatch = await bcrypt.compare(password, credential.passwordHash);
    if (!isMatch) {
      throw httpError(401, "Invalid credentials");
    }

    const accessToken = jwt.sign(
      {
        sub: credential.userId,
        userId: credential.userId,
        role: credential.role,
        jti: crypto.randomUUID(),
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || "1h" }
    );

    const accessTokenTtlMs = parseDurationToMs(process.env.JWT_EXPIRES, 60 * 60 * 1000);
    const refreshTokenTtlMs = Number(process.env.REFRESH_TOKEN_EXPIRES_MS || 7 * 24 * 60 * 60 * 1000);

    const refreshToken = crypto.randomBytes(64).toString("hex");
    await RefreshToken.create({
      userId: credential.userId,
      token: refreshToken,
      expiresAt: new Date(Date.now() + refreshTokenTtlMs),
    });

    res.cookie(ACCESS_COOKIE_NAME, accessToken, buildCookieOptions(accessTokenTtlMs));
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, buildCookieOptions(refreshTokenTtlMs));

    return res.status(200).json({
      message: "Login successful",
      role: credential.role,
      user_id: credential.userId,
      userId: credential.userId,
      access_token: accessToken,
      accessToken,
      refresh_token: refreshToken,
      refreshToken,
      token: accessToken,
    });
  } catch (err) {
    console.error("Login error:", err.message);
    return res.status(err.status || 500).json({ message: err.message || "Login failed" });
  }
};

exports.isLogin = async (req, res) => {
  return res.status(200).json({
    active: true,
    message: "user is logged in",
    user: req.auth,
  });
};

exports.logout = async (req, res) => {
  try {
    const refresh = resolveRefreshToken(req);

    if (refresh) {
      await RefreshToken.update({ isRevoked: true }, { where: { token: refresh } });
    }

    const access = resolveAccessToken(req);

    if (access) {
      const decoded = jwt.decode(access);
      revokeAccessToken(access, decoded?.exp);
    }

    const clearCookieOptions = buildClearCookieOptions();
    res.clearCookie(ACCESS_COOKIE_NAME, clearCookieOptions);
    res.clearCookie(REFRESH_COOKIE_NAME, clearCookieOptions);

    return res.status(200).json({ message: "Logged out" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Logout failed" });
  }
};
