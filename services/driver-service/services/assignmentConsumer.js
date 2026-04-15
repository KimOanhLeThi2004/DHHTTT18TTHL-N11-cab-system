const { consumer } = require("./kafka");
const assignmentService = require("./assignmentService");
const { notifyBookingCancelled } = require("../websocketGateway");
const { redis } = require("../db/redis");

async function startAssignmentConsumer() {
  await consumer.connect();

  console.log("Kafka connected");
  await consumer.subscribe({
    topic: "driver.assigned.requested",
    fromBeginning: false,
  });
  await consumer.subscribe({
    topic: "BOOKING_CANCELLED",
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const data = JSON.parse(message.value.toString());

        if (topic === "driver.assigned.requested") {
          const result = await assignmentService.handleAssignment(data);
          if (!result.accepted && result.reason === "already_assigned_to_other_driver") {
            console.log("Skip overwritten assignment:", {
              bookingId: data.bookingId,
              incomingDriverId: data.driverId,
            });
            return;
          }
          console.log("Received assignment:", {
            bookingId: data.bookingId,
            driverId: data.driverId,
            status: result.reason,
          });
          return;
        }

        if (topic === "BOOKING_CANCELLED") {
          const { bookingId } = data;
          const assignment = await redis.get(`assignment:${bookingId}`);
          if (!assignment) {
            return;
          }
          const parsed = JSON.parse(assignment);
          await redis.del(`assignment:${bookingId}`);
          notifyBookingCancelled(parsed.driverId, bookingId);
          return;
        }
      } catch (err) {
        console.error("Assignment consumer error:", err);
      }
    },
  });
}

module.exports = startAssignmentConsumer;
