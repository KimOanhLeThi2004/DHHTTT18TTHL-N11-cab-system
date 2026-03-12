const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true // RIDE_STATUS, PAYMENT
    },
    title: String,
    message: String,
    payload: Object,
    isRead: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
