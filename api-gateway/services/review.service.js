const axios = require("axios");
const { REVIEW_SERVICE_URL } = require("../config");

async function createReview(payload, token) {
  const res = await axios.post(
    `${REVIEW_SERVICE_URL}/reviews`,
    payload,
    {
      headers: {
        Authorization: token
      }
    }
  );

  return res.data;
}

module.exports = { createReview };
