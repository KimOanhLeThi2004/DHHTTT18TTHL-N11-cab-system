const axios = require("axios");
const { BOOKING_SERVICE_URL} = require("../config");

async function createBooking(payload, token) {
  const res = await axios.post(
    `${BOOKING_SERVICE_URL}/bookings`,
    payload,
    {
      headers: {
        Authorization: token
      }
    }
  );

  return res.data;
}

module.exports = { createBooking };
