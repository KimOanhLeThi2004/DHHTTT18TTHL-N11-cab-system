const express = require("express");
const router = express.Router();
const rideService = require("../services/ride.service");

router.put("/:rideId/status", async (req, res) => {
  try {
    const { rideId } = req.params;
    const { status } = req.body;

    const ride = await rideService.updateRideStatus(rideId, status);

    res.json(ride);
  } catch (err) {
    console.error("Ride update error:", err.message);

    res.status(500).json({
      message: "Ride update failed",
    });
  }
});

router.get("/booking/:bookingId", async (req, res) => {
  try {
    const { bookingId } = req.params;
    const ride = await rideService.getRideByBookingId(bookingId);
    res.json(ride);
  } catch (err) {
    console.error("Ride get error:", err.message);
    res.status(500).json({ message: "Ride get failed" });
  }
});

module.exports = router;
