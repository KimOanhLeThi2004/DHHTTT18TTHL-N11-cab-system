const axios = require("axios");

const USER_SERVICE_URL = "http://localhost:3002";

async function getUserProfile(jwt) {
  const res = await axios.get(
    `${USER_SERVICE_URL}/users/me`,
    {
      headers: {
        // internal call – KHÔNG dùng user JWT
        Authorization: jwt
      }
    }
  );

  return res.data;
}


module.exports = { getUserProfile };
