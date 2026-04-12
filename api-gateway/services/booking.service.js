const axios = require("axios");
const { BOOKING_SERVICE_URL } = require("../config");

async function createBooking(payload, token) {
  try {
    const res = await axios.post(`${BOOKING_SERVICE_URL}/bookings`, payload, {
      headers: {
        Authorization: token,
      },
      timeout: 7000,
    });

    return res.data;
  } catch (err) {
    const e = new Error(err.response?.data?.message || "Booking service error");
    e.status = err.response?.status || 500;
    throw e;
  }
}

async function cancelBooking(bookingId, token) {
  try {
    const res = await axios.patch(`${BOOKING_SERVICE_URL}/bookings/${bookingId}/cancel`, {}, {
      headers: {
        Authorization: token,
      },
      timeout: 7000,
    });

    return res.data;
  } catch (err) {
    const e = new Error(err.response?.data?.message || "Cancel booking failed");
    e.status = err.response?.status || 500;
    throw e;
  }
}

async function getMyBookings(token) {
  try {
    const res = await axios.get(`${BOOKING_SERVICE_URL}/bookings/me`, {
      headers: {
        Authorization: token,
      },
      timeout: 7000,
    });
    return res.data;
  } catch (err) {
    const e = new Error(err.response?.data?.message || "List bookings failed");
    e.status = err.response?.status || 500;
    throw e;
  }
}

module.exports = { createBooking, cancelBooking, getMyBookings };
