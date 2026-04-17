import axios from "axios";
import { resolveApiBaseUrl } from "../utils/runtime";

const baseURL = resolveApiBaseUrl();
const SESSION_ACCESS_TOKEN_KEY = "cab_access_token_session";

let accessTokenCache = null;

function purgeLegacyTokenStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("cab_access_token");
  window.localStorage.removeItem("cab_access_token_customer");
  window.localStorage.removeItem("cab_access_token_driver");
}

function readSessionAccessToken() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(SESSION_ACCESS_TOKEN_KEY);
}

function writeSessionAccessToken(token) {
  if (typeof window === "undefined") return;
  if (!token) {
    window.sessionStorage.removeItem(SESSION_ACCESS_TOKEN_KEY);
    return;
  }
  window.sessionStorage.setItem(SESSION_ACCESS_TOKEN_KEY, token);
}

function extractAccessToken(payload = {}) {
  return payload.accessToken || payload.access_token || payload.token || null;
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
accessTokenCache = readSessionAccessToken();

if (accessTokenCache) {
  api.defaults.headers.common.Authorization = `Bearer ${accessTokenCache}`;
}

function setAccessToken(token) {
  accessTokenCache = token || null;
  writeSessionAccessToken(accessTokenCache);

  if (accessTokenCache) {
    api.defaults.headers.common.Authorization = `Bearer ${accessTokenCache}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

api.interceptors.request.use((config) => {
  const token = accessTokenCache || readSessionAccessToken();
  if (!token) return config;

  const nextConfig = { ...config };
  nextConfig.headers = nextConfig.headers || {};
  if (!nextConfig.headers.Authorization && !nextConfig.headers.authorization) {
    nextConfig.headers.Authorization = `Bearer ${token}`;
  }
  return nextConfig;
});

// -------- AUTH --------
export const login = async (email, password, role) => {
  const response = await api.post("/auth/login", { email, password, role });
  const token = extractAccessToken(response?.data);
  if (token) {
    setAccessToken(token);
  }
  return response;
};

export const register = (data) =>
  api.post("/auth/register", data);

export const logout = async () => {
  try {
    return await api.post("/auth/logout");
  } finally {
    setAccessToken(null);
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
