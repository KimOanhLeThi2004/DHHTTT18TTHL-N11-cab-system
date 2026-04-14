// api-gateway/routes/users.route.js
const express = require("express");
const axios = require("../http-client");
const { USER_SERVICE_URL } = require("../config");

const router = express.Router();

router.get("/me", async (req, res) => {
  try {
    const response = await axios.get(`${USER_SERVICE_URL}/users/me`, {
      headers: {
        Authorization: req.headers.authorization, // forward JWT
      },
    });

    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json(err.response?.data || { message: "User service error" });
  }
});

module.exports = router;
