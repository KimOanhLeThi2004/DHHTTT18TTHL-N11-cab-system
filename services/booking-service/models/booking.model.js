const mongoose = require('mongoose');
const { randomUUID } = require('crypto');

function normalizeIdempotencyKey(value) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const lower = trimmed.toLowerCase();
  if (lower === 'null' || lower === 'undefined') return undefined;
  return trimmed;
}

const BookingSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },

    pickup: {
      lat: Number,
      lng: Number
    },

    dropoff: {
      lat: Number,
      lng: Number
    },

    distanceKm: {
      type: Number,
      default: 0
    },

    durationMin: {
      type: Number,
      default: 0
    },

    vehicleType: {
      type: String,
      enum: ['BIKE', 'CAR'],
      required: true
    },

    estimatedPrice: Number,

    idempotencyKey: {
      type: String,
      index: true,
      default: () => randomUUID(),
      set: normalizeIdempotencyKey
    },

    driverId: {
      type: String,
      default: null
    },

    acceptedAt: {
      type: Date,
      default: null
    },

    status: {
      type: String,
      enum: [
        'REQUESTED',
        'CONFIRMED',
        'ACCEPTED',
        'CANCELLED',
        'FAILED',
        'COMPLETED'
      ],
      default: 'REQUESTED',
      index: true
    }
  },
  { timestamps: true }
);

BookingSchema.index(
  { userId: 1, idempotencyKey: 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.model('Booking', BookingSchema);
