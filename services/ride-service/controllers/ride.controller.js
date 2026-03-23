const Ride = require("../models/ride.model");
const { redis } = require("../db/redis");
const { publishRideStatusChanged } = require("../kafka/producer");

async function createRide(req, res) {
  const { bookingId, userId, driverId } = req.body;

  // 🔒 Lock driver (1 driver = 1 ride)
  const lockKey = `driver:${driverId}:lock`;
  const locked = await redis.set(lockKey, "1", {
    NX: true,
    EX: 600
  });

  if (!locked) {
    return res.status(409).json({ error: "Driver is busy" });
  }

  const ride = await Ride.create({
    bookingId,
    userId,
    driverId
  });

  await publishRideStatusChanged(ride);

  res.json(ride);
}

async function updateStatus(req, res) {
  const { rideId } = req.params;
  const { status } = req.body;

  const ride = await Ride.findByIdAndUpdate(
    rideId,
    { status },
    { new: true }
  );

  await publishRideStatusChanged(ride);

  // Release lock if finished
  if (["COMPLETED", "CANCELLED"].includes(status)) {
    await redis.del(`driver:${ride.driverId}:lock`);
  }

  res.json(ride);
}

async function getRideByBookingId(req, res) {
  const { bookingId } = req.params;

  const ride = await Ride.findOne({ bookingId });
  if (!ride) {
    return res.status(404).json({ message: "Ride not found" });
  }

  return res.json(ride);
}

module.exports = {
  createRide,
  updateStatus,
  getRideByBookingId
};
