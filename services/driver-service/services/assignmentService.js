const { redis } = require("../db/redis");
const { notifyDriverAssignment } = require("../websocketGateway");

async function handleAssignment(data) {
  const { bookingId } = data;
  await redis.set(`assignment:${bookingId}`, JSON.stringify(data), "EX", 30);
  notifyDriverAssignment(data);
}

module.exports = { handleAssignment };
