// websocketGateway.js
const driverSockets = new Map();

function registerDriverSocket(driverId, ws) {
  driverSockets.set(driverId, ws);
}

function removeDriverSocket(driverId) {
  driverSockets.delete(driverId);
}

function notifyDriverAssignment({ bookingId, driverId, pickup, dropoff, distanceKm, price }) {
  const ws = driverSockets.get(driverId);

  if (!ws) {
    console.log("Driver offline, retry later:", driverId);
    return false;
  }

  ws.send(JSON.stringify({
    type: "ASSIGN_RIDE",
    data: { bookingId, pickup, dropoff, distanceKm, price }
  }));

  console.log("Assignment pushed to driver:", driverId);
  return true;
}

module.exports = {
  registerDriverSocket,
  removeDriverSocket,
  notifyDriverAssignment,
};