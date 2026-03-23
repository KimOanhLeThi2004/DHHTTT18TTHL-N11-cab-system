const { consumer } = require("./kafka");
const assignmentService = require("./assignmentService");
const { notifyDriverAssignment, notifyBookingCancelled } = require("../websocketGateway");
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
          const ok = notifyDriverAssignment(data);
          if (!ok) {
            console.log("Driver offline -> need reassign:", data.driverId);
            // TODO: emit Kafka event reassign
          }
          console.log("Received assignment:", data);

          await assignmentService.handleAssignment(data);
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
