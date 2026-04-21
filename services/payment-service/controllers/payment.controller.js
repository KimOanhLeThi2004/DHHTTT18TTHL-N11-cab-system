const axios = require("../http-client");
const jwt = require("jsonwebtoken");
const { Payment } = require("../models/payment.model");
const { publishPaymentSuccess } = require("../kafka/producer");

const ALLOWED_PAYMENT_METHODS = ["CASH", "WALLET", "CARD"];
const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL || "http://booking-service:3004";

function normalizeIdempotencyKey(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const lowered = trimmed.toLowerCase();
  if (lowered === "null" || lowered === "undefined") return null;
  return trimmed;
}

async function compensateCancelBooking(bookingId, authHeader) {
  if (!bookingId || !authHeader) return;
  try {
    await axios.patch(
      `${BOOKING_SERVICE_URL}/bookings/${bookingId}/cancel`,
      {},
      {
        headers: {
          Authorization: authHeader,
        },
        timeout: 3000,
      }
    );
  } catch (err) {
    // Compensation is best-effort. Keep original payment failure as primary signal.
    console.warn("Compensation cancel booking failed:", err.response?.data?.message || err.message);
  }
}

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
  let bookingIdForCompensation = null;
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
    bookingIdForCompensation = bookingId;

    const existing = await Payment.findOne({
      where: { bookingId, status: "SUCCESS" },
    });
    if (existing) {
      return res.json(existing);
    }

    const finalMethod = (method || payment_method || "").toUpperCase();
    if (!ALLOWED_PAYMENT_METHODS.includes(finalMethod)) {
      await compensateCancelBooking(bookingId, req.headers.authorization);
      return res.status(400).json({ message: "Invalid payment method" });
    }

    if (inputAmount !== undefined && inputAmount !== null) {
      const parsedInputAmount = Number(inputAmount);
      if (!Number.isFinite(parsedInputAmount) || parsedInputAmount <= 0) {
        await compensateCancelBooking(bookingId, req.headers.authorization);
        return res.status(400).json({ message: "Invalid amount" });
      }
    }

    const ride = await getRideByBookingId(bookingId);
    const amount = Number(ride?.price ?? inputAmount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      await compensateCancelBooking(bookingId, req.headers.authorization);
      return res.status(400).json({ message: "Invalid amount" });
    }

    const userId = ride?.user?.id || req.user?.userId;
    const driverId = ride?.driver?.id || req.body.driverId || "UNKNOWN_DRIVER";
    const idempotencyKey = normalizeIdempotencyKey(req.headers["idempotency-key"]);

    if (idempotencyKey) {
      const existedByIdem = await Payment.findOne({
        where: { bookingId, idempotencyKey },
      });
      if (existedByIdem) {
        return res.json(existedByIdem);
      }
    }

    let payment;
    try {
      payment = await Payment.create({
        bookingId,
        userId,
        driverId,
        amount,
        method: finalMethod,
        status: "SUCCESS",
        idempotencyKey,
      });
    } catch (createErr) {
      // Handle race condition safely (duplicate create due retries/concurrency).
      if (createErr?.name === "SequelizeUniqueConstraintError") {
        const existedAfterRace = await Payment.findOne({ where: { bookingId } });
        if (existedAfterRace) {
          return res.json(existedAfterRace);
        }
      }
      throw createErr;
    }

    try {
      await publishPaymentSuccess(payment);
    } catch (publishErr) {
      // Payment is already persisted; avoid turning this into a client-visible failure.
      console.warn("publishPaymentSuccess failed:", publishErr.message);
    }

    return res.json(payment);
  } catch (err) {
    console.error("PAYMENT ERROR:", err.message);
    await compensateCancelBooking(bookingIdForCompensation, req.headers.authorization);
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
