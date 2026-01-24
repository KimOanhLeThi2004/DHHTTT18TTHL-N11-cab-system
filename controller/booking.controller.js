const bookingService = require('../services/booking.service');

exports.createBooking = async (req, res) => {
  const booking = await bookingService.createBooking(req.body);
  res.status(201).json(booking);
};

exports.getAllBookings = async (req, res) => {
  const bookings = await bookingService.getAllBookings();
  res.json(bookings);
};

exports.getBookingById = async (req, res) => {
  const booking = await bookingService.getBookingById(req.params.id);
  res.json(booking);
};

exports.assignDriver = async (req, res) => {
  const booking = await bookingService.assignDriver(
    req.params.id,
    req.body.driverId
  );
  res.json(booking);
};

exports.updateStatus = async (req, res) => {
  const booking = await bookingService.updateStatus(
    req.params.id,
    req.body.status
  );
  res.json(booking);
};

exports.deleteBooking = async (req, res) => {
  await bookingService.deleteBooking(req.params.id);
  res.json({ message: 'Booking deleted' });
};
