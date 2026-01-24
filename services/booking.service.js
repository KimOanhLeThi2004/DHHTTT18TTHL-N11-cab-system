const Booking = require('../models/booking.model');

const createBooking = (data) => Booking.create(data);

const getAllBookings = () => Booking.find();

const getBookingById = (id) => Booking.findById(id);

const assignDriver = (id, driverId) =>
  Booking.findByIdAndUpdate(
    id,
    { driverId, status: 'CONFIRMED' },
    { new: true }
  );

const updateStatus = (id, status) =>
  Booking.findByIdAndUpdate(id, { status }, { new: true });

const deleteBooking = (id) => Booking.findByIdAndDelete(id);

module.exports = {
  createBooking,
  getAllBookings,
  getBookingById,
  assignDriver,
  updateStatus,
  deleteBooking
};
