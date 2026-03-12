const axios = require("axios");
const { RIDE_SERVICE_URL } = require("../config");
const token = require("../middlewares/pricing.middleware");

async function updateRideStatus(rideId, status) {
  const jwt = "Bear " + token();

  const res = await axios.put(
    `${RIDE_SERVICE_URL}/rides/${rideId}/status`,
    { status },
    {
      headers: {
        Authorization: jwt
      }
    }
  );

  return res.data;
}


module.exports = {
  updateRideStatus
};