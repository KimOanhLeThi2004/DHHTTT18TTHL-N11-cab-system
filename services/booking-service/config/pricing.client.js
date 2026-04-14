const axios = require("../http-client");

async function calculatePrice(payload) {
  const res = await axios.post(
    `${process.env.PRICING_SERVICE_URL}/pricing/calculate`,
    payload
  );
  return res.data;
}

module.exports = {
  calculatePrice
};
