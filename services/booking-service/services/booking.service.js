const Booking = require('../models/booking.model');
// const pricingClient = require('../config/pricing.client');
const { emitEvent } = require('../infra/kafka.producer');

async function createBooking(userId, data) {


  const booking = await Booking.create({
    userId: userId, // thay bằng name, phone?
    pickup: data.pickup,
    dropoff: data.dropoff,
    vehicleType: data.vehicleType,
    estimatedPrice: data.totalPrice
  });

  await emitEvent('BOOKING_CREATED', {
    bookingId: booking._id,
    userId: booking.userId,
    pickup: booking.pickup,
    dropoff: booking.dropoff,
    vehicleType: booking.vehicleType,
    estimatedPrice: booking.estimatedPrice
  });

  return booking;
}

module.exports = { createBooking };
