const express = require("express");
const { login, register, logout } = require("../services/auth.service");

const router = express.Router();

// POST /auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Thiếu email hoặc password" });
    }

    const result = await login(email, password, role);

    return res.json(result); // { token, userId, ... }
  } catch (err) {
    console.error("Login error:", err);
    return res.status(401).json({ message: err.message || "Sai email hoặc mật khẩu" });
  }
});

// POST /auth/register
router.post("/register", async (req, res) => {
  try {
    const { email, password, role, name, phone, vehicleType } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Thiếu email hoặc password" });
    }

    const result = await register(email, password, role, name, phone, vehicleType);

    return res.status(201).json(result); // { userId, email }
  } catch (err) {
    console.error("Register error:", err);
    return res.status(400).json({ message: err.message || "Đăng ký thất bại" });
  }
});
 
router.post("/logout", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "Thiếu refreshToken" });
    }

    const result = await logout(refreshToken);

    return res.status(201).json(result); // { userId, email }
  } catch (err) {
    console.error("Register error:", err);
    return res.status(400).json({ message: err.message || " thất bại" });
  }
})

module.exports = router;