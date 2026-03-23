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

async function cancelBooking(userId, bookingId) {
  const booking = await Booking.findOneAndUpdate(
    {
      _id: bookingId,
      userId,
      status: { $in: ["PENDING", "CONFIRMED", "ACCEPTED"] }
    },
    {
      $set: { status: "CANCELLED" }
    },
    { new: true }
  );

  if (!booking) {
    throw new Error("Booking not found or cannot cancel");
  }

  await emitEvent("BOOKING_CANCELLED", {
    bookingId: booking._id,
    userId: booking.userId,
    cancelledAt: new Date().toISOString()
  });

  return booking;
}

module.exports = { createBooking, cancelBooking };
