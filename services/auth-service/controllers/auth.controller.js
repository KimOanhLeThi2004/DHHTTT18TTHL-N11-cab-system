const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const crypto = require("crypto");
const { Credential, RefreshToken } = require("../models");
const signServiceJwt = require("../middlewares/signServiceJwt");
const { revokeAccessToken } = require("../services/tokenStore");
require("dotenv").config();

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
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

    const refreshToken = crypto.randomBytes(64).toString("hex");
    await RefreshToken.create({
      userId: credential.userId,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return res.status(200).json({
      access_token: accessToken,
      accessToken,
      refresh_token: refreshToken,
      refreshToken,
      role: credential.role,
      user_id: credential.userId,
      userId: credential.userId,
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
    const { refreshToken, refresh_token, accessToken } = req.body || {};
    const refresh = refreshToken || refresh_token;

    if (refresh) {
      await RefreshToken.update({ isRevoked: true }, { where: { token: refresh } });
    }

    const authHeader = req.headers.authorization;
    const access =
      accessToken ||
      (authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null);

    if (access) {
      const decoded = jwt.decode(access);
      revokeAccessToken(access, decoded?.exp);
    }

    return res.status(200).json({ message: "Logged out" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Logout failed" });
  }
};
