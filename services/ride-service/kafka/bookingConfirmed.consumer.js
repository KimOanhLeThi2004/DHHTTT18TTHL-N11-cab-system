// consumers/bookingConfirmed.consumer.js
const { consumer, producer } = require("./kafka");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const Ride = require("../models/ride.model");
require('dotenv').config();

function signServiceJwt() {
  return jwt.sign(
    {
      service: "ride-service",
      scope: ["internal:user.read", "internal:driver.read"],
    },
    process.env.SERVICE_JWT_SECRET,
    { expiresIn: "5m" }
  );
}

async function getUserInfo(userId, serviceJwt) {
  console.log(serviceJwt)
  const res = await axios.get(`http://localhost:3002/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${serviceJwt}`,
      "X-Internal-Origin": "ride-service",
    },
    timeout: 5000,
  });
  console.log(res.data)
  return res.data; // { name, phone }
}

async function getDriverInfo(driverId, serviceJwt) {
  const res = await axios.get(`http://localhost:3005/drivers/${driverId}`, {
    headers: {
      Authorization: `Bearer ${serviceJwt}`,
      "X-Internal-Origin": "ride-service",
    },
    timeout: 5000, 
  });

  return res.data; // { name, phone, vehicleType }
}

async function startBookingConfirmedConsumer() {
  console.log("helo")
  await consumer.connect();

  await consumer.subscribe({
    topic: "booking.confirmed",
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const event = JSON.parse(message.value.toString());
        const {
          bookingId,
          userId,
          driverId,
          pickup,
          dropoff,
          estimatedPrice,
          confirmedAt,
        } = event;
        console.log("hello 2")
        console.log("📥 Received booking.confirmed: 2", event);

        // ✅ Idempotency: tránh tạo ride trùng
        const existed = await Ride.findOne({ bookingId });
        if (existed) {
          console.log("⚠️ Ride already exists for booking:", bookingId);
          return;
        }

        const serviceJwt = signServiceJwt();

        // 🔁 Gọi user-service & driver-service song song cho nhanh
        const [user, driver] = await Promise.all([
          getUserInfo(userId, serviceJwt),
          getDriverInfo(driverId, serviceJwt),
        ]);
        console.log(user)
        console.log(driver)
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
        await producer.connect();
        await producer.send({
            topic: "ride.status.changed",
            messages: [
              {
                key: ride.id.toString(), // partition ổn định, tránh race condition
                value: JSON.stringify({
                  rideId: ride.id,
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
                  status: ride.status,
                  pickup,
                  dropoff,
                  confirmedAt: ride.confirmedAt,
                  createdAt: ride.createdAt,
                }),
              },
            ],
          });
        console.log("🚕 Ride created:", ride._id);
      } catch (err) {
        console.error("❌ Error processing booking.confirmed:", err.message);
        // TODO: đẩy sang DLQ hoặc retry topic nếu muốn
      }
    },
  });
}

module.exports = startBookingConfirmedConsumer;
