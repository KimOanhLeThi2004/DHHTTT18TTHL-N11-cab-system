require("dotenv").config();

module.exports = {
    PORT: process.env.PORT || 3000,

    AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || "http://auth-service:3001",
    USER_SERVICE_URL: process.env.USER_SERVICE_URL || "http://user-service:3002",
    PRICING_SERVICE_URL: process.env.PRICING_SERVICE_URL || "http://pricing-service:3003",
    BOOKING_SERVICE_URL: process.env.BOOKING_SERVICE_URL || "http://booking-service:3004",
    DRIVER_SERVICE_URL: process.env.DRIVER_SERVICE_URL || "http://driver-service:3005",
    RIDE_SERVICE_URL: process.env.RIDE_SERVICE_URL || "http://ride-service:3007",
    PAYMENT_SERVICE_URL: process.env.PAYMENT_SERVICE_URL || "http://payment-service:3006",
    REVIEW_SERVICE_URL: process.env.REVIEW_SERVICE_URL || "http://review-service:3009",
    NOTIFICATION_SERVICE_URL: process.env.NOTIFICATION_SERVICE_URL || "http://notification-service:3008",
    AI_SERVICE_URL: process.env.AI_SERVICE_URL || "http://ai-matching-service:3010"
};
