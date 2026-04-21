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

async function findNearbyDrivers({ lat, lng, radiusKm = 5, vehicleType = "CAR" }) {
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      radiusKm: String(radiusKm),
      vehicleType: String(vehicleType || "CAR"),
    });

    const response = await axios.get(
      `${DRIVER_SERVICE_URL}/drivers/nearby?${params.toString()}`,
      {
        timeout: 5000,
      }
    );

    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    const e = new Error(error.response?.data?.message || "Driver service error");
    e.status = error.response?.status || 500;
    throw e;
  }
}

module.exports = {
  acceptRide,
  rejectRide,
  getDriver,
  findNearbyDrivers,
};
