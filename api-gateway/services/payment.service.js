const axios = require("axios");
const { PAYMENT_SERVICE_URL } = require("../config");

async function pay(payload, token) {
  const res = await axios.post(
    `${PAYMENT_SERVICE_URL}/payments/pay`,
    payload,
    {
      headers: {
        Authorization: token
      }
    }
  );

  return res.data;
}

module.exports = { pay };
