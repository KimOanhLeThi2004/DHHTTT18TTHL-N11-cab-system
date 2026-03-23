const express = require("express");
const { pay } = require("../services/payment.service");

const router = express.Router();

router.post("/pay", async (req, res) => {
  try {
    const token = req.headers.authorization;
    const payload = req.body;
    const data = await pay(payload, token);
    res.json(data);
  } catch (error) {
    console.error("Payment error:", error.message);
    res.status(500).json({ message: "Payment failed" });
  }
});

module.exports = router;
