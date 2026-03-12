const { consumer } = require("./kafka");
const assignmentService = require("./assignmentService");
const { notifyDriverAssignment } = require("../websocketGateway");

async function startAssignmentConsumer() {
  await consumer.connect();

console.log("✅ Kafka connected");
  await consumer.subscribe({
    topic: "driver.assigned.requested",
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const data = JSON.parse(message.value.toString());
        const ok = notifyDriverAssignment(data);
        if (!ok) {
          console.log("Driver offline → cần reassign:", data.driverId);
          // TODO: emit Kafka event reassign
        }
        console.log("Received assignment:", data);

        await assignmentService.handleAssignment(data);
      } catch (err) {
        console.error("Assignment consumer error:", err);
      }
    },
  });
}



module.exports = startAssignmentConsumer;
