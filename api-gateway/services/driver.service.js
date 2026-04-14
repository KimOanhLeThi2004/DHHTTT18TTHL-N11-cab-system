const axios = require("../http-client");

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
    const e = new Error(error.response?.data?.message || "Driver service error");
    e.status = error.response?.status || 500;
    throw e;
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
    const e = new Error(error.response?.data?.message || "Driver service error");
    e.status = error.response?.status || 500;
    throw e;
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
    const e = new Error(error.response?.data?.message || "Driver service error");
    e.status = error.response?.status || 500;
    throw e;
  }
}

module.exports = {
  acceptRide,
  rejectRide,
  getDriver
};
