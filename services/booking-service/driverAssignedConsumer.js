const { consumer } = require("./infra/kafka.consumer"); 
const { producer } = require("./infra/kafka.producer"); 
const Booking = require("./models/booking.model");

async function startDriverAcceptedConsumer() {
  await consumer.connect();
  await producer.connect(); // nếu chưa connect ở app start

  await consumer.subscribe({
    topic: "driver.accepted",
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const data = JSON.parse(message.value.toString());
        const { bookingId, driverId, acceptedAt } = data;

        console.log("Received driver.accepted:", data);

        // ✅ Atomic update + state validation
        const updatedBooking = await Booking.findOneAndUpdate(
          {
            _id: bookingId,
            status: "PENDING", // hoặc PENDING -> nên thống nhất 1 state
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
          console.log(
            "Booking not found or invalid state transition:",
            bookingId
          );
          return;
        }

        console.log("Booking updated to ACCEPTED:", updatedBooking._id);

        // 🔥 Publish event cho Ride service
        await producer.send({
          topic: "booking.confirmed",
          messages: [
            {
              key: bookingId, // rất quan trọng để tránh race condition
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

        console.log("Published booking.confirmed:", bookingId);
      } catch (err) {
        console.error("Error processing driver.accepted:", err);
      }
    },
  });
}

module.exports = startDriverAcceptedConsumer;
