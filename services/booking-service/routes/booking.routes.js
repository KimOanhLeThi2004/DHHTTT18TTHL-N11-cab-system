const express = require('express');
const router = express.Router();
const bookingService = require('../services/booking.service');

router.post('/', async (req, res) => {
  const userId = req.user.id;
  try {
    const booking = await bookingService.createBooking(userId, req.body);
    res.status(201).json(booking);
  } catch (err) {
    res.status(err.status || 400).json({ message: err.message });
  }
});

router.get('/me', async (req, res) => {
  const userId = req.user.id;
  try {
    const bookings = await bookingService.listBookingsByUser(userId);
    res.status(200).json(bookings);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

router.patch('/:bookingId/cancel', async (req, res) => {
  const userId = req.user.id;
  const { bookingId } = req.params;

  try {
    const booking = await bookingService.cancelBooking(userId, bookingId);
    res.json(booking);
  } catch (err) {
    res.status(err.status || 400).json({ message: err.message });
  }
});

module.exports = router;
