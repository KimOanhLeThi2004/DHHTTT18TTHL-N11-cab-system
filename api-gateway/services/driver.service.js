const axios = require("axios");

const {DRIVER_SERVICE_URL} = require("../config");

/* ================= ACCEPT RIDE ================= */
async function acceptRide(data, token) {
  try {
    const response = await axios.post(
      `${DRIVER_SERVICE_URL}/drivers/accept`,
      data,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Gateway ACCEPT ERROR:", error.response?.data || error.message);
    throw error.response?.data || { message: "Driver service error" };
  }
}

/* ================= REJECT RIDE ================= */
async function rejectRide(data, token) {
  try {
    const response = await axios.post(
      `${DRIVER_SERVICE_URL}/drivers/reject`,
      data,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Gateway REJECT ERROR:", error.response?.data || error.message);
    throw error.response?.data || { message: "Driver service error" };
  }
}

async function getDriver(token) {
  try {
    const response = await axios.get(
      `${DRIVER_SERVICE_URL}/drivers/me`,
      
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Gateway REJECT ERROR:", error.response?.data || error.message);
    throw error.response?.data || { message: "Driver service error" };
  }
}

module.exports = {
  acceptRide,
  rejectRide,
  getDriver
};