const axios = require("../http-client");
const { PRICING_SERVICE_URL } = require("../config");
const signServiceToken = require("../middlewares/pricing.middleware");

async function calculatePrice(payload) {
  try {
    const jwtToken = `Bearer ${signServiceToken()}`;
    const res = await axios.post(
      `${PRICING_SERVICE_URL}/pricing/calculate`,
      payload,
      {
        headers: {
          Authorization: jwtToken,
        },
        timeout: 5000,
      }
    );

    return res.data;
  } catch (err) {
    const error = new Error(err.response?.data?.message || "Pricing service error");
    error.status = err.response?.status || 500;
    throw error;
  }
}

module.exports = { calculatePrice };
