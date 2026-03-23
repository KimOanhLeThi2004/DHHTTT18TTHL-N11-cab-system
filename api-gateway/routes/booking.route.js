const express = require("express");
const { calculatePrice } = require("../services/pricing.service");
const { createBooking, cancelBooking } = require("../services/booking.service");


const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const {vehicleType, pickup, dropoff, distanceKm, durationMin, requestTime } = req.body;
    const token = req.headers.authorization;
    // 1. Call Pricing
    const pricing = await calculatePrice({vehicleType, pickup, dropoff,distanceKm, durationMin, requestTime });
    // console.log(pricing) // pass
    // 2. Call Booking
    const booking = await createBooking(
      {
        pickup,
        dropoff,
        vehicleType,
        totalPrice: pricing.totalPrice
      },
      token
    ); // pass

    res.json({
      bookingId: booking._id,

    });

  } catch (err) {
    console.error("Booking flow error:", err.message);
    res.status(500).json({ message: "Booking failed" });
  }
});

router.patch("/:bookingId/cancel", async (req, res) => {
  try {
    const { bookingId } = req.params;
    const token = req.headers.authorization;
    const booking = await cancelBooking(bookingId, token);
    res.json(booking);
  } catch (err) {
    console.error("Booking cancel error:", err.message);
    res.status(500).json({ message: "Cancel booking failed" });
  }
});

module.exports = router;
