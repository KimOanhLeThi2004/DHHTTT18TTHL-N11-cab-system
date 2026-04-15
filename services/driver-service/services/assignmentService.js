const { redis } = require("../db/redis");
const { notifyDriverAssignment } = require("../websocketGateway");

function resolveDriverId(payload = {}) {
  return payload.driverId || payload.driver_id || null;
}

async function handleAssignment(data) {
  const { bookingId } = data || {};
  const incomingDriverId = resolveDriverId(data);
  if (!bookingId || !incomingDriverId) {
    return { accepted: false, reason: "invalid_payload" };
  }

  const key = `assignment:${bookingId}`;
  const serialized = JSON.stringify(data);
  const created = await redis.set(key, serialized, { EX: 30, NX: true });

  if (created === "OK") {
    notifyDriverAssignment(data);
    return { accepted: true, reason: "created" };
  }

  const currentRaw = await redis.get(key);
  if (!currentRaw) {
    const retried = await redis.set(key, serialized, { EX: 30, NX: true });
    if (retried === "OK") {
      notifyDriverAssignment(data);
      return { accepted: true, reason: "created_after_race" };
    }
    return { accepted: false, reason: "race_lost" };
  }

  let current = null;
  try {
    current = JSON.parse(currentRaw);
  } catch (_) {
    current = null;
  }

  const currentDriverId = resolveDriverId(current || {});
  if (currentDriverId && String(currentDriverId) !== String(incomingDriverId)) {
    return { accepted: false, reason: "already_assigned_to_other_driver" };
  }

  await redis.expire(key, 30);
  return { accepted: false, reason: "duplicate_same_driver" };
}

module.exports = { handleAssignment };
