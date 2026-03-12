const express = require('express');
const router = express.Router();
const bookingService = require('../services/booking.service');

router.post('/', async (req, res) => {
  const userId = req.user.id;
  console.log(userId)
  try {
    const booking = await bookingService.createBooking(userId,req.body);
    res.status(201).json(booking);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
