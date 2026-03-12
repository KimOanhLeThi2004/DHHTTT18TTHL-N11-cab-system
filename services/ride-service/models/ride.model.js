// models/ride.model.js
const mongoose = require("mongoose");

const RideSchema = new mongoose.Schema(
  {
    bookingId: { type: String, required: true, unique: true },

    user: {
      id: String,
      name: String,
      phone: String,
    },

    driver: {
      id: String,
      name: String,
      phone: String,
      vehicleType: String,
    },

    pickup: {
      lat: Number,
      lng: Number,
    },

    dropoff: {
      lat: Number,
      lng: Number,
    },

    status: {
      type: String,
      enum: ["ONGOING", "COMPLETED", "CANCELLED"],
      default: "ONGOING",
    },

    confirmedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ride", RideSchema);
