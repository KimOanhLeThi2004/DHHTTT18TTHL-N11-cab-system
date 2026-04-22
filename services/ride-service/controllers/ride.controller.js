const Ride = require("../models/ride.model");
const { redis } = require("../db/redis");
const { publishRideStatusChanged } = require("../kafka/producer");

const ALLOWED_STATUSES = ["ONGOING", "COMPLETED", "CANCELLED"];

function normalizeRideStatus(status) {
  const normalized = String(status || "").trim().toUpperCase();
  if (normalized === "DONE") {
    return "COMPLETED";
  }
  return normalized;
}

async function createRide(req, res) {
  try {
    const { bookingId, user, driver, pickup, dropoff, price = 0 } = req.body;
    if (!bookingId || !user?.id || !driver?.id) {
      return res.status(400).json({ message: "bookingId, user and driver are required" });
    }

    const lockKey = `driver:${driver.id}:lock`;
    const locked = await redis.set(lockKey, "1", { NX: true, EX: 600 });
    if (!locked) {
      return res.status(409).json({ message: "Driver is busy" });
    }

    const existed = await Ride.findOne({ bookingId });
    if (existed) {
      return res.status(200).json(existed);
    }

    const ride = await Ride.create({
      bookingId,
      user,
      driver,
      pickup,
      dropoff,
      price,
      status: "ONGOING",
      confirmedAt: new Date(),
    });
    await publishRideStatusChanged(ride);
    return res.status(201).json(ride);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function updateStatus(req, res) {
  try {
    const { rideId } = req.params;
    const status = normalizeRideStatus(req.body?.status);
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const ride = await Ride.findByIdAndUpdate(rideId, { status }, { new: true });
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    await publishRideStatusChanged(ride);
    if (["COMPLETED", "CANCELLED"].includes(status)) {
      await redis.del(`driver:${ride.driver.id}:lock`);
    }

    return res.json(ride);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function getRideByBookingId(req, res) {
  try {
    const { bookingId } = req.params;
    const ride = await Ride.findOne({ bookingId });
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }
    return res.json(ride);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

module.exports = {
  createRide,
  updateStatus,
  getRideByBookingId,
};
