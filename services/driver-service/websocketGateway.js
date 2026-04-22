// websocketGateway.js
const driverSockets = new Map();

function normalizeDriverSocketKey(driverId) {
  if (driverId === undefined || driverId === null) return null;
  const key = String(driverId).trim();
  return key || null;
}

function registerDriverSocket(driverId, ws) {
  const key = normalizeDriverSocketKey(driverId);
  if (!key || !ws) return null;
  driverSockets.set(key, ws);
  return key;
}

function removeDriverSocket(driverId, ws = null) {
  const key = normalizeDriverSocketKey(driverId);
  if (!key) return false;
  const current = driverSockets.get(key);
  if (!current) return false;
  if (ws && current !== ws) {
    return false;
  }
  driverSockets.delete(key);
  return true;
}

function sendToDriver(driverId, payload) {
  const key = normalizeDriverSocketKey(driverId);
  if (!key) {
    return false;
  }
  const ws = driverSockets.get(key);
  if (!ws || ws.readyState !== 1) {
    return false;
  }
  try {
    ws.send(JSON.stringify(payload));
    return true;
  } catch (_) {
    return false;
  }
}

function notifyDriverAssignment({ bookingId, driverId, pickup, dropoff, distanceKm, price }) {
  const sent = sendToDriver(driverId, {
    type: "ASSIGN_RIDE",
    data: { bookingId, driverId, pickup, dropoff, distanceKm, price }
  });
  if (!sent) {
    console.log("Driver offline, retry later:", driverId);
    return false;
  }

  console.log("Assignment pushed to driver:", driverId);
  return true;
}

function notifyBookingCancelled(driverId, bookingId) {
  return sendToDriver(driverId, {
    type: "BOOKING_CANCELLED",
    data: { bookingId }
  });
}

module.exports = {
  registerDriverSocket,
  removeDriverSocket,
  notifyDriverAssignment,
  notifyBookingCancelled,
};
