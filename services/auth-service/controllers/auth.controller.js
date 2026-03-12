const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const axios = require("axios");
const crypto = require("crypto");
const { Credential, RefreshToken } = require("../models");

const signServiceJwt = require("../middlewares/signServiceJwt");
require('dotenv').config();

/**
 * REGISTER
 * Auth tạo credential + userId
 * User Service sẽ nghe event USER_CREATED sau
 */
exports.register = async (req, res) => {
  const { email, password, role, name, phone, vehicleType } = req.body;

  if (!["CUSTOMER", "DRIVER"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  try {
    // 1️⃣ Sinh userId trước (Auth là nguồn chân lý identity)
    const userId = uuidv4();

    // 2️⃣ Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    let profileId;

    // 3️⃣ Ký service token để gọi nội bộ
    let serviceToken;

    if (role === "CUSTOMER") {
      serviceToken = signServiceJwt({
        service: "auth-service",
        aud: "user-service",
        scope: ["user.create"],
      });

      const { data } = await axios.post(
        process.env.USER_SERVICE_URL + "/users",
        { id: userId, email, name, phone },   // gửi id sang user-service
        { headers: { Authorization: `Bearer ${serviceToken}` } }
      );

      profileId = data.id;
    }

    if (role === "DRIVER") {
      serviceToken = signServiceJwt({
        service: "auth-service",
        aud: "driver-service",
        scope: ["driver.create"],
      });
          console.log({ id: userId, name, phone, vehicleType })
      const { data } = await axios.post(
        process.env.DRIVER_SERVICE_URL + "/drivers",
        { id: userId, name, phone, vehicleType }, // gửi id sang driver-service
        { headers: { Authorization: `Bearer ${serviceToken}` } }
      );

      profileId = data.id;
    }

    // 4️⃣ Lưu Auth (userId trỏ sang profile service)
    const auth = await Credential.create({
      email,
      passwordHash,
      role,
      userId: profileId,
    });

    return res.status(201).json({ auth });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ message: "Register failed" });
  }
};
/**
 * LOGIN
 */
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;


    if (!["CUSTOMER", "DRIVER"].includes(role)) {
      return res.status(400).json({ message: "Role không hợp lệ" });
    }

    const credential = await Credential.findOne({ where: { email } });

    // ❌ Không tồn tại hoặc sai role hoặc bị disable
    if (!credential || !credential.isActive || credential.role !== role) {
      return res.status(404).json({ message: "Tài khoản không tồn tại" });
    }

    const isMatch = await bcrypt.compare(password, credential.passwordHash);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Sai thông tin đăng nhập, vui lòng nhập lại" });
    }

    const accessToken = jwt.sign(
      {
        sub: credential.id,
        userId: credential.userId,
        role: credential.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || "15m" }
    );

    const refreshToken = crypto.randomBytes(64).toString("hex");

    await RefreshToken.create({
      userId: credential.userId,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return res.json({
      accessToken,
      refreshToken,
      role: credential.role,
      userId: credential.userId,
    });
  } catch (err) {
    console.error("Login error:", err.message);
    return res.status(500).json({ message: "Login failed" });
  }
};

exports.isLogin = async (req, res) => {

  return res.status(200).json({message: 'user was login'});
}

exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await RefreshToken.update(
        { isRevoked: true },
        { where: { token: refreshToken } }
      );
    }

    return res.json({ message: "Logged out" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};