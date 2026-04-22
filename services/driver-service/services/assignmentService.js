const { redis } = require("../db/redis");
const { notifyDriverAssignment } = require("../websocketGateway");

const DEFAULT_ASSIGNMENT_TTL_SECONDS = 120;
const MIN_ASSIGNMENT_TTL_SECONDS = 10;

function resolveDriverId(payload = {}) {
  return payload.driverId || payload.driver_id || null;
}

function resolveAssignmentTtlSeconds() {
  const configured = Number(process.env.ASSIGNMENT_TTL_SECONDS);
  if (!Number.isFinite(configured)) {
    return DEFAULT_ASSIGNMENT_TTL_SECONDS;
  }
  return Math.max(MIN_ASSIGNMENT_TTL_SECONDS, Math.floor(configured));
}

function buildAssignmentPayload(data, ttlSeconds) {
  const now = new Date();
  return {
    ...data,
    assignedAt: data?.assignedAt || now.toISOString(),
    expiresAt: data?.expiresAt || new Date(now.getTime() + ttlSeconds * 1000).toISOString(),
  };
}

async function handleAssignment(data) {
  const { bookingId } = data || {};
  const incomingDriverId = resolveDriverId(data);
  if (!bookingId || !incomingDriverId) {
    return { accepted: false, reason: "invalid_payload" };
  }

  const ttlSeconds = resolveAssignmentTtlSeconds();
  const assignmentPayload = buildAssignmentPayload(data, ttlSeconds);
  const key = `assignment:${bookingId}`;
  const serialized = JSON.stringify(assignmentPayload);
  const created = await redis.set(key, serialized, { EX: ttlSeconds, NX: true });

  if (created === "OK") {
    notifyDriverAssignment(assignmentPayload);
    return { accepted: true, reason: "created" };
  }

  const currentRaw = await redis.get(key);
  if (!currentRaw) {
    const retried = await redis.set(key, serialized, { EX: ttlSeconds, NX: true });
    if (retried === "OK") {
      notifyDriverAssignment(assignmentPayload);
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

  await redis.expire(key, ttlSeconds);
  return { accepted: false, reason: "duplicate_same_driver" };
}

module.exports = { handleAssignment };
