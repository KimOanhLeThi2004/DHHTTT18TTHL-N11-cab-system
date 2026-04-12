const Booking = require("../models/booking.model");
const { emitEvent } = require("../infra/kafka.producer");

function isValidLatLng(point) {
  if (!point || typeof point !== "object") return false;
  return Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lng));
}

function validateCreatePayload(data) {
  if (!data.pickup) {
    return { status: 400, message: "pickup is required" };
  }
  if (!data.dropoff) {
    return { status: 400, message: "dropoff is required" };
  }
  if (!isValidLatLng(data.pickup)) {
    return { status: 422, message: "pickup must be valid lat/lng" };
  }
  if (!isValidLatLng(data.dropoff)) {
    return { status: 422, message: "dropoff must be valid lat/lng" };
  }
  if (!["BIKE", "CAR"].includes(data.vehicleType)) {
    return { status: 400, message: "Invalid vehicle type" };
  }

  const distanceKm = Number(data.distanceKm ?? 0);
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    return { status: 422, message: "distanceKm must be a non-negative number" };
  }

  const totalPrice = Number(data.totalPrice);
  if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
    return { status: 400, message: "Invalid price" };
  }

  return null;
}

function throwHttp(status, message) {
  const err = new Error(message);
  err.status = status;
  throw err;
}

async function createBooking(userId, data) {
  const validationError = validateCreatePayload(data);
  if (validationError) {
    throwHttp(validationError.status, validationError.message);
  }

  if (data.idempotencyKey) {
    const existed = await Booking.findOne({
      userId,
      idempotencyKey: data.idempotencyKey,
    });
    if (existed) {
      return existed;
    }
  }

  const booking = await Booking.create({
    userId,
    pickup: {
      lat: Number(data.pickup.lat),
      lng: Number(data.pickup.lng),
    },
    dropoff: {
      lat: Number(data.dropoff.lat),
      lng: Number(data.dropoff.lng),
    },
    distanceKm: Number(data.distanceKm ?? 0),
    durationMin: Number(data.durationMin ?? 0),
    vehicleType: data.vehicleType,
    estimatedPrice: Number(data.totalPrice),
    status: "REQUESTED",
    idempotencyKey: data.idempotencyKey || undefined,
  });

  const eventPayload = {
    event_type: "ride_requested",
    booking_id: booking._id.toString(),
    user_id: booking.userId,
    pickup: booking.pickup,
    dropoff: booking.dropoff,
    vehicle_type: booking.vehicleType,
    estimated_price: booking.estimatedPrice,
    timestamp: new Date().toISOString(),
  };

  // New unified event stream
  await emitEvent("ride_events", eventPayload);
  // Backward compatibility topics used by existing services
  await emitEvent("BOOKING_CREATED", {
    bookingId: booking._id.toString(),
    userId: booking.userId,
    pickup: booking.pickup,
    dropoff: booking.dropoff,
    vehicleType: booking.vehicleType,
    estimatedPrice: booking.estimatedPrice,
  });

  return booking;
}

async function cancelBooking(userId, bookingId) {
  const booking = await Booking.findOne({ _id: bookingId, userId });
  if (!booking) {
    throwHttp(404, "Booking not found");
  }

  if (!["REQUESTED", "CONFIRMED"].includes(booking.status)) {
    throwHttp(409, "Booking cannot be cancelled after driver accepted");
  }

  booking.status = "CANCELLED";
  await booking.save();

  await emitEvent("BOOKING_CANCELLED", {
    bookingId: booking._id.toString(),
    userId: booking.userId,
    cancelledAt: new Date().toISOString(),
  });

  await emitEvent("ride_events", {
    event_type: "ride_cancelled",
    booking_id: booking._id.toString(),
    user_id: booking.userId,
    timestamp: new Date().toISOString(),
  });

  return booking;
}

async function listBookingsByUser(userId) {
  const bookings = await Booking.find({ userId }).sort({ createdAt: -1 }).lean();
  return bookings.map((booking) => ({
    booking_id: booking._id.toString(),
    status: booking.status,
    vehicle_type: booking.vehicleType,
    estimated_price: booking.estimatedPrice,
    driver_id: booking.driverId || null,
    created_at: booking.createdAt,
    updated_at: booking.updatedAt,
  }));
}

module.exports = {
  createBooking,
  cancelBooking,
  listBookingsByUser,
};
