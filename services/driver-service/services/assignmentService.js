const {redis} = require("../db/redis");
const { notifyDriverAssignment } = require("../websocketGateway");
async function handleAssignment(data) {
  const { bookingId, driverId } = data;

  // Lưu assignment với TTL 15 giây
  await redis.set(
    `assignment:${bookingId}`,
    JSON.stringify(data),
    "EX",
    30
  );

  console.log("Assignment stored, waiting for accept...");

  // TODO: gửi websocket/push notification cho driver
}

module.exports = { handleAssignment };
