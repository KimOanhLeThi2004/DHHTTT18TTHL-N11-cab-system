const { Kafka } = require("kafkajs");
const Notification = require("../models/notification.model");
require("dotenv").config();

let sendToUser; // sẽ nhận function

const kafka = new Kafka({
  clientId: "notification-service",
  brokers: [process.env.KAFKA_BROKER],
});

const consumer = kafka.consumer({
  groupId: "notification-group",
});

const startConsumer = async (sendFn) => {
  sendToUser = sendFn; // inject function

  await consumer.connect();

  await consumer.subscribe({
    topics: ["ride.status.changed", "payment.success"],
    fromBeginning: false,
  });

  console.log("✅ Notification consumer started");

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      let data;

      try {
        data = JSON.parse(message.value.toString());
      } catch (err) {
        console.error("Invalid JSON:", err.message);
        return;
      }

      console.log("📥 Received:", topic, data);

      try {
        switch (topic) {
          case "ride.status.changed":
            await Notification.create({
              userId: data.user.id,
              type: "RIDE_STATUS",
              title: "Ride status updated",
              message: `Ride ${data.rideId} is now ${data.status}`,
              payload: data,
            });

            // ✅ GỌI FUNCTION
            sendToUser(data.user.id, {
              type: "RIDE_STATUS",
              ...data,
            });
            break;

          case "payment.success":
            await Notification.create({
              userId: data.user.id,
              type: "PAYMENT",
              title: "Payment success",
              message: `Payment for booking ${data.bookingId} completed`,
              payload: data,
            });

            sendToUser(data.user.id, {
              type: "PAYMENT_SUCCESS",
              ...data,
            });
            break;

          default:
            break;
        }
      } catch (err) {
        console.error("Error handling message:", err.message);
      }
    },
  });
};

module.exports = startConsumer;