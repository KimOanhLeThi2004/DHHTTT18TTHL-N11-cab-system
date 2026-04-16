import axios from "axios";
import { resolveApiBaseUrl } from "../utils/runtime";

const baseURL = resolveApiBaseUrl();
function purgeLegacyTokenStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("cab_access_token");
  window.localStorage.removeItem("cab_access_token_customer");
  window.localStorage.removeItem("cab_access_token_driver");
}

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

purgeLegacyTokenStorage();

// -------- AUTH --------
export const login = (email, password, role) =>
  api.post("/auth/login", { email, password, role });

export const register = (data) =>
  api.post("/auth/register", data);

export const logout = async () => {
  try {
    return await api.post("/auth/logout");
  } finally {
    purgeLegacyTokenStorage();
  }
};

// -------- USER --------
export const getMe = async () => {
  const res = await api.get("/users/me");
  return res.data;
};

export const updateMe = (data) =>
  api.put("/users/me", data).then((res) => res.data);

// -------- BOOKING --------
export const createBooking = (payload) =>
  api.post("/booking", payload);

export const cancelBooking = (bookingId) =>
  api.patch(`/booking/${bookingId}/cancel`);

/* ================= DRIVER ================= */
export const acceptRide = (bookingId) =>
  api.post("/drivers/accept", {
    bookingId,
  });

export const rejectRide = (bookingId) =>
  api.post("/drivers/reject", {
    bookingId,
  });

export const getDriver = () => {
  return api.get("/drivers/me");
};

export const getDriverLocation = (driverId) => {
  return api.get(`/drivers/location/${driverId}`);
};

// -------- PRICING --------
export const calculatePrice = (payload) => {
  return api.post("/pricing/calculate", payload);
};

// ride
export const updateRideStatus = (rideId, status) => {
  return api.put(`/rides/${rideId}/status`, {
    status,
  });
};

export const getRideByBookingId = (bookingId) => {
  return api.get(`/rides/booking/${bookingId}`);
};

// payment
export const createPayment = (payload) => {
  return api.post("/payments/pay", payload);
};

// review
export const createReview = (payload) => {
  return api.post("/reviews", payload);
};

export const getDriverReviews = (driverId) => {
  return api.get(`/reviews/driver/${driverId}`);
};

export const getDriverRating = (driverId) => {
  return api.get(`/reviews/driver/${driverId}/rating`);
};

export const getDriverRevenue = () => {
  return api.get("/payments/driver/total");
};

export default api;
