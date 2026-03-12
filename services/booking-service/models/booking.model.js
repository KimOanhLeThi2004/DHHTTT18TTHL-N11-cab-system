const mongoose = require('mongoose');

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

    vehicleType: {
      type: String,
      enum: ['BIKE', 'CAR'],
      required: true
    },

    estimatedPrice: Number,

    status: {
      type: String,
      enum: [
        'PENDING',
        'CONFIRMED',
        'CANCELLED',
        'COMPLETED'
      ],
      default: 'PENDING',
      index: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Booking', BookingSchema);
