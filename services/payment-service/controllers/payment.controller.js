const axios = require("../http-client");
const jwt = require("jsonwebtoken");
const { Payment } = require("../models/payment.model");
const { publishPaymentSuccess } = require("../kafka/producer");

const ALLOWED_PAYMENT_METHODS = ["CASH", "WALLET", "CARD"];

function signServiceJwt() {
  const secret =
    process.env.INTERNAL_JWT_SECRET ||
    process.env.SERVICE_JWT_SECRET ||
    "api-gateway";
  return jwt.sign(
    {
      service: "payment-service",
      scope: ["ride.read"],
    },
    secret,
    { expiresIn: "5m" }
  );
}

async function getRideByBookingId(bookingId) {
  try {
    const token = signServiceJwt();
    const res = await axios.get(`${process.env.RIDE_SERVICE_URL}/rides/booking/${bookingId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 3000,
    });

    return res.data;
  } catch (_) {
    return null;
  }
}

async function pay(req, res) {
  try {
    const {
      bookingId,
      method,
      payment_method,
      amount: inputAmount,
    } = req.body;

    if (!bookingId) {
      return res.status(400).json({ message: "Missing bookingId" });
    }

    const finalMethod = (method || payment_method || "").toUpperCase();
    if (!ALLOWED_PAYMENT_METHODS.includes(finalMethod)) {
      return res.status(400).json({ message: "Invalid payment method" });
    }

    const ride = await getRideByBookingId(bookingId);
    const amount = Number(ride?.price ?? inputAmount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const userId = ride?.user?.id || req.user?.userId;
    const driverId = ride?.driver?.id || req.body.driverId || "UNKNOWN_DRIVER";

    const existing = await Payment.findOne({
      where: { bookingId, status: "SUCCESS" },
    });
    if (existing) {
      return res.json(existing);
    }

    const payment = await Payment.create({
      bookingId,
      userId,
      driverId,
      amount,
      method: finalMethod,
      status: "SUCCESS",
    });

    await publishPaymentSuccess(payment);
    return res.json(payment);
  } catch (err) {
    console.error("PAYMENT ERROR:", err.message);
    return res.status(500).json({ message: err.message || "Payment failed" });
  }
}

async function getDriverRevenue(req, res) {
  try {
    const driverId = req.user?.userId;
    if (!driverId) {
      return res.status(400).json({ message: "Missing driver id" });
    }

    const total = await Payment.sum("amount", {
      where: { driverId, status: "SUCCESS" },
    });

    return res.json({ driverId, total: Number(total || 0) });
  } catch (err) {
    console.error("REVENUE ERROR:", err.message);
    return res.status(500).json({ message: err.message || "Revenue query failed" });
  }
}

module.exports = { pay, getDriverRevenue };
