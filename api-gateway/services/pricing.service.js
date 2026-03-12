const axios = require("axios");
const { PRICING_SERVICE_URL} = require("../config");
const token = require('../middlewares/pricing.middleware');


async function calculatePrice(payload) {
  const jwt = "Bear "+ token();
  const res = await axios.post(
    `${PRICING_SERVICE_URL}/pricing/calculate`,
    payload,
    {
      headers: {
        Authorization: jwt
      }
    }
  );

  return res.data;
}

module.exports = { calculatePrice };
