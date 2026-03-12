// src/api/index.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000", // API Gateway
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// 🔐 Tự động gắn JWT cho mọi request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// -------- AUTH --------
export const login = (email, password, role) =>
  api.post("/auth/login", { email, password, role });

export const register = (email, password) =>
  api.post("/auth/register", { email, password });

export const logout = (refreshToken) =>
  api.post("/auth/logout", { refreshToken });
// -------- USER --------
export const getMe = async () => {
  const res = await api.get("/users/me");
  return res.data;   //  trả object user
};

export const updateMe = (data) =>
  api.put("/users/me", data).then((res) => res.data);



// -------- BOOKING --------
export const createBooking = (payload) =>
  api.post("/booking", payload);



/* ================= DRIVER ================= */

//  Nhận cuốc
export const acceptRide = (bookingId) =>
  api.post("/drivers/accept", {
    bookingId
  });

//  Từ chối cuốc
export const rejectRide = (bookingId) =>
  api.post("/drivers/reject", {
    bookingId
  });

export const getDriver = () =>{
  return api.get("/drivers/me");
}
  // -------- PRICING --------
export const calculatePrice = (payload) => {

  return  api.post("/pricing/calculate", payload);
};

// ride
export const updateRideStatus = (rideId, status) => {
  return api.put(`/rides/${rideId}/status`, {
    status: status
  });
};
export default api;