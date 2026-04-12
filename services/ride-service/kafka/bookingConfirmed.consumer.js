const { consumer } = require("./kafka");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const Ride = require("../models/ride.model");
const { initProducer, publishRideStatusChanged } = require("./producer");
require("dotenv").config();

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || "http://localhost:3002";
const DRIVER_SERVICE_URL = process.env.DRIVER_SERVICE_URL || "http://localhost:3005";

function signServiceJwt() {
  const secret = process.env.SERVICE_JWT_SECRET || process.env.INTERNAL_JWT_SECRET || "ride-service";
  return jwt.sign(
    {
      service: "ride-service",
      scope: ["internal:user.read", "internal:driver.read"],
    },
    secret,
    { expiresIn: "5m" }
  );
}

async function getUserInfo(userId, serviceJwt) {
  const res = await axios.get(`${USER_SERVICE_URL}/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${serviceJwt}`,
      "X-Internal-Origin": "ride-service",
    },
    timeout: 5000,
  });
  return res.data;
}

async function getDriverInfo(driverId, serviceJwt) {
  const res = await axios.get(`${DRIVER_SERVICE_URL}/drivers/${driverId}`, {
    headers: {
      Authorization: `Bearer ${serviceJwt}`,
      "X-Internal-Origin": "ride-service",
    },
    timeout: 5000,
  });
  return res.data;
}

async function startBookingConfirmedConsumer() {
  await consumer.connect();
  await initProducer();
  await consumer.subscribe({ topic: "booking.confirmed", fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const event = JSON.parse(message.value.toString());
        const { bookingId, userId, driverId, pickup, dropoff, estimatedPrice, confirmedAt } = event;

        const existed = await Ride.findOne({ bookingId });
        if (existed) {
          return;
        }

        const serviceJwt = signServiceJwt();
        const [user, driver] = await Promise.all([
          getUserInfo(userId, serviceJwt),
          getDriverInfo(driverId, serviceJwt),
        ]);

        const ride = await Ride.create({
          bookingId,
          user: {
            id: userId,
            name: user.name,
            phone: user.phone,
          },
          driver: {
            id: driverId,
            name: driver.name,
            phone: driver.phone,
            vehicleType: driver.vehicleType,
          },
          pickup,
          dropoff,
          price: estimatedPrice,
          status: "ONGOING",
          confirmedAt: confirmedAt ? new Date(confirmedAt) : new Date(),
        });

        await publishRideStatusChanged(ride);
      } catch (err) {
        console.error("Error processing booking.confirmed:", err.message);
      }
    },
  });
}

module.exports = startBookingConfirmedConsumer;
