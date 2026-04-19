const express = require("express");
const { calculatePrice } = require("../services/pricing.service");
const {
  createBooking,
  cancelBooking,
  getMyBookings,
} = require("../services/booking.service");

const router = express.Router();
const idempotencyCache = new Map();
const pricingCircuit = {
  failures: 0,
  openUntil: 0,
  threshold: Number(process.env.PRICING_CIRCUIT_THRESHOLD || 3),
  cooldownMs: Number(process.env.PRICING_CIRCUIT_COOLDOWN_MS || 15000),
};

function isValidLatLng(point) {
  if (!point || typeof point !== "object") return false;
  const lat = Number(point.lat);
  const lng = Number(point.lng);
  return Number.isFinite(lat) && Number.isFinite(lng);
}

function validateCreateBody(body) {
  if (!body.pickup) return "pickup is required";
  if (!body.dropoff) return "dropoff is required";
  if (!isValidLatLng(body.pickup)) return "pickup must be valid lat/lng";
  if (!isValidLatLng(body.dropoff)) return "dropoff must be valid lat/lng";
  if (!body.vehicleType) return "vehicleType is required";
  if (!["CAR", "BIKE"].includes(String(body.vehicleType).toUpperCase())) {
    return "Invalid vehicle type";
  }

  if (body.distanceKm === undefined || body.distanceKm === null || body.distanceKm === "") {
    return "distanceKm is required";
  }

  const distanceKm = Number(body.distanceKm);
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    return "distanceKm must be a non-negative number";
  }

  const durationMin = Number(body.durationMin ?? 0);
  if (!Number.isFinite(durationMin) || durationMin < 0) {
    return "durationMin must be a non-negative number";
  }

  return null;
}

function normalizeIdempotencyKey(rawKey) {
  if (typeof rawKey !== "string") return undefined;
  const trimmed = rawKey.trim();
  if (!trimmed) return undefined;
  const lower = trimmed.toLowerCase();
  if (lower === "null" || lower === "undefined") return undefined;
  return trimmed;
}

async function withRetry(fn, retries = 2) {
  let lastError;
  for (let i = 0; i <= retries; i += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

router.post("/", async (req, res) => {
  try {
    const validationMessage = validateCreateBody(req.body);
    if (validationMessage) {
      const status =
        validationMessage.includes("required") || validationMessage === "Invalid vehicle type"
          ? 400
          : 422;
      return res.status(status).json({ message: validationMessage });
    }

    const {
      vehicleType,
      pickup,
      dropoff,
      distanceKm,
      durationMin = 0,
      requestTime = new Date().toISOString(),
    } = req.body;
    const token = req.headers.authorization;
    const idempotencyKey = normalizeIdempotencyKey(req.headers["idempotency-key"]);
    const cacheKey = idempotencyKey ? `${req.user.id}:${idempotencyKey}` : undefined;

    if (cacheKey && idempotencyCache.has(cacheKey)) {
      return res.status(200).json(idempotencyCache.get(cacheKey));
    }

    let pricing;
    if (Date.now() < pricingCircuit.openUntil) {
      pricing = {
        totalPrice: Math.max(10000, Math.round(distanceKm * 10000)),
        surgeMultiplier: 1,
        etaMin: Math.max(1, Math.round(durationMin || distanceKm * 3)),
      };
    } else {
      try {
        pricing = await withRetry(() =>
          calculatePrice({
            vehicleType,
            pickup,
            dropoff,
            distanceKm,
            durationMin,
            requestTime,
          })
        );
        pricingCircuit.failures = 0;
      } catch (pricingErr) {
        pricingCircuit.failures += 1;
        if (pricingCircuit.failures >= pricingCircuit.threshold) {
          pricingCircuit.openUntil = Date.now() + pricingCircuit.cooldownMs;
        }
        throw pricingErr;
      }
    }

    const booking = await createBooking(
      {
        pickup,
        dropoff,
        vehicleType,
        distanceKm,
        durationMin,
        requestTime,
        totalPrice: pricing.totalPrice,
        idempotencyKey,
      },
      token
    );

    const response = {
      booking_id: booking._id || booking.booking_id,
      status: booking.status,
      eta_min: Number(pricing.etaMin ?? durationMin),
      price: Number(booking.estimatedPrice ?? pricing.totalPrice),
      surge_multiplier: pricing.surgeMultiplier,
    };

    if (cacheKey) {
      idempotencyCache.set(cacheKey, response);
    }

    return res.status(201).json(response);
  } catch (err) {
    console.error("Booking flow error:", err.message);
    return res.status(err.status || 500).json({ message: err.message || "Booking failed" });
  }
});

router.get("/", async (req, res) => {
  try {
    const token = req.headers.authorization;
    const bookings = await getMyBookings(token);
    return res.json(bookings);
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message || "List bookings failed" });
  }
});

router.patch("/:bookingId/cancel", async (req, res) => {
  try {
    const { bookingId } = req.params;
    const token = req.headers.authorization;
    const booking = await cancelBooking(bookingId, token);
    return res.json(booking);
  } catch (err) {
    console.error("Booking cancel error:", err.message);
    return res.status(err.status || 500).json({ message: err.message || "Cancel booking failed" });
  }
});

module.exports = router;
