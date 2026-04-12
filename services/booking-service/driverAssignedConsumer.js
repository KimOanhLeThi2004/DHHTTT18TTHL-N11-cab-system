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

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const data = JSON.parse(message.value.toString());
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
      } catch (err) {
        console.error("Error processing driver.accepted:", err.message);
      }
    },
  });
}

module.exports = startDriverAcceptedConsumer;
