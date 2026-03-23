const axios = require("axios");
const jwt = require("jsonwebtoken");
const { Payment } = require("../models/payment.model");
const { publishPaymentSuccess } = require("../kafka/producer");

function signServiceJwt() {
  return jwt.sign(
    {
      service: "payment-service",
      scope: ["ride.read"],
    },
    process.env.INTERNAL_JWT_SECRET,
    { expiresIn: "5m" }
  );
}

async function getRideByBookingId(bookingId) {
  const token = signServiceJwt();
  const res = await axios.get(
    `${process.env.RIDE_SERVICE_URL}/rides/booking/${bookingId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 5000,
    }
  );

  return res.data;
}

async function pay(req, res) {
  try {
    const { bookingId, method } = req.body;
    const driverId = req.user?.userId;

    if (!bookingId) {
      return res.status(400).json({ message: "Missing bookingId" });
    }

    const ride = await getRideByBookingId(bookingId);

    if (!ride?.driver?.id || !ride?.user?.id) {
      return res.status(400).json({ message: "Invalid ride data" });
    }

    if (ride.driver.id !== driverId) {
      return res.status(403).json({ message: "Not your ride" });
    }

    if (ride.status !== "COMPLETED") {
      return res.status(400).json({ message: "Ride not completed" });
    }

    const amount = Number(ride.price || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const existing = await Payment.findOne({
      where: { bookingId, status: "SUCCESS" },
    });
    if (existing) {
      return res.json(existing);
    }

    const payment = await Payment.create({
      bookingId,
      userId: ride.user.id,
      driverId: ride.driver.id,
      amount,
      method,
      status: "SUCCESS"
    });

    await publishPaymentSuccess(payment);

    res.json(payment);
  } catch (err) {
    console.error("PAYMENT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
}

async function getDriverRevenue(req, res) {
  try {
    const driverId = req.user?.userId;
    const total = await Payment.sum("amount", {
      where: { driverId, status: "SUCCESS" },
    });

    res.json({ driverId, total: Number(total || 0) });
  } catch (err) {
    console.error("REVENUE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { pay, getDriverRevenue };
