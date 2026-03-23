const express = require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");
const authMiddleware = require("./middlewares/auth.middleware");
const signServiceToken = require("./middlewares/pricing.middleware");
const bookingRoute = require("./routes/booking.route");
const {
  PORT,
  AUTH_SERVICE_URL,
  USER_SERVICE_URL,
  PRICING_SERVICE_URL,
  DRIVER_SERVICE_URL,
  RIDE_SERVICE_URL,
  PAYMENT_SERVICE_URL,
  REVIEW_SERVICE_URL
} = require("./config");

const app = express();
app.use(cors());

const withServiceToken = () => `Bearer ${signServiceToken()}`;

const proxyTo = (target, options = {}) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    onProxyReq: (proxyReq) => {
      if (options.serviceToken) {
        proxyReq.setHeader("Authorization", withServiceToken());
      }
    },
  });

// Custom booking flow (pricing + booking)
app.use("/booking", express.json(), authMiddleware, bookingRoute);

// Simple proxy routes
app.use("/auth", proxyTo(AUTH_SERVICE_URL));
app.use("/users", proxyTo(USER_SERVICE_URL));
app.use("/drivers", proxyTo(DRIVER_SERVICE_URL));
app.use("/pricing", proxyTo(PRICING_SERVICE_URL, { serviceToken: true }));
app.use("/rides", proxyTo(RIDE_SERVICE_URL, { serviceToken: true }));
app.use("/payments", authMiddleware, proxyTo(PAYMENT_SERVICE_URL));
app.use("/reviews", authMiddleware, proxyTo(REVIEW_SERVICE_URL));
app.get("/health", (_, res) => res.send("OK"));

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
