const { consumer } = require("./infra/kafka.consumer");
const { producer, ensureConnected } = require("./infra/kafka.producer");
const Booking = require("./models/booking.model");

async function startDriverAcceptedConsumer() {
  await consumer.connect();
  await ensureConnected();

  await consumer.subscribe({
    topic: "driver.accepted",
    fromBeginning: false,
  });
  await consumer.subscribe({
    topic: "driver.rejected",
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const data = JSON.parse(message.value.toString());

        if (topic === "driver.accepted") {
          const { bookingId, driverId, acceptedAt } = data;

          const updatedBooking = await Booking.findOneAndUpdate(
            {
              _id: bookingId,
              status: { $in: ["REQUESTED", "CONFIRMED"] },
            },
            {
              $set: {
                status: "ACCEPTED",
                driverId,
                acceptedAt: acceptedAt ? new Date(acceptedAt) : new Date(),
              },
            },
            { new: true }
          );

          if (!updatedBooking) {
            console.log("Booking not found or invalid state transition:", bookingId);
            return;
          }

          await producer.send({
            topic: "booking.confirmed",
            messages: [
              {
                key: bookingId,
                value: JSON.stringify({
                  bookingId,
                  userId: updatedBooking.userId,
                  driverId,
                  pickup: updatedBooking.pickup,
                  dropoff: updatedBooking.dropoff,
                  estimatedPrice: updatedBooking.estimatedPrice,
                  confirmedAt: new Date().toISOString(),
                }),
              },
            ],
          });

          await producer.send({
            topic: "ride_events",
            messages: [
              {
                key: bookingId,
                value: JSON.stringify({
                  event_type: "ride_accepted",
                  booking_id: bookingId,
                  user_id: updatedBooking.userId,
                  driver_id: driverId,
                  timestamp: new Date().toISOString(),
                }),
              },
            ],
          });
          return;
        }

        if (topic === "driver.rejected") {
          const { bookingId, driverId, reason = "driver_rejected" } = data;
          if (!bookingId || !driverId) {
            console.log("driver.rejected missing bookingId/driverId");
            return;
          }

          const booking = await Booking.findById(bookingId);
          if (!booking) {
            console.log("driver.rejected booking not found:", bookingId);
            return;
          }
          if (["CANCELLED", "COMPLETED", "FAILED"].includes(booking.status)) {
            return;
          }

          const updatedBooking = await Booking.findOneAndUpdate(
            {
              _id: bookingId,
              status: { $in: ["REQUESTED", "CONFIRMED", "ACCEPTED"] },
            },
            {
              $set: {
                status: "REQUESTED",
                driverId: null,
                acceptedAt: null,
              },
            },
            { new: true }
          );
          if (!updatedBooking) {
            return;
          }

          await producer.send({
            topic: "ride_events",
            messages: [
              {
                key: bookingId,
                value: JSON.stringify({
                  event_type: "ride_requested",
                  booking_id: bookingId,
                  user_id: updatedBooking.userId,
                  pickup: updatedBooking.pickup,
                  dropoff: updatedBooking.dropoff,
                  vehicle_type: updatedBooking.vehicleType,
                  estimated_price: updatedBooking.estimatedPrice,
                  rejected_driver_id: driverId,
                  excluded_driver_ids: [driverId],
                  rejection_reason: reason,
                  timestamp: new Date().toISOString(),
                }),
              },
            ],
          });
          return;
        }
      } catch (err) {
        console.error(`Error processing ${topic || "driver-event"}:`, err.message);
      }
    },
  });
}

module.exports = startDriverAcceptedConsumer;
