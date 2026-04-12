const { producer } = require("./kafka");
let connected = false;

async function ensureConnected() {
  if (connected) return;
  await producer.connect();
  connected = true;
}

async function publishAccepted(bookingId, driverId) {
  await ensureConnected();
  await producer.send({
    topic: "driver.accepted",
    messages: [
      {
        key: bookingId,
        value: JSON.stringify({
          bookingId,
          driverId,
          acceptedAt: new Date().toISOString(),
        }),
      },
    ],
  });
}

async function publishRejected(bookingId, driverId, reason) {
  await ensureConnected();
  await producer.send({
    topic: "driver.rejected",
    messages: [
      {
        key: bookingId,
        value: JSON.stringify({
          bookingId,
          driverId,
          reason,
        }),
      },
    ],
  });
}

async function publishDriverLocation({
  bookingId,
  userId,
  driverId,
  lat,
  lng,
  heading = null,
  speedKph = null,
}) {
  await ensureConnected();
  await producer.send({
    topic: "driver.location.updated",
    messages: [
      {
        key: bookingId,
        value: JSON.stringify({
          bookingId,
          userId,
          driverId,
          lat: Number(lat),
          lng: Number(lng),
          heading,
          speedKph,
          timestamp: new Date().toISOString(),
        }),
      },
    ],
  });
}

module.exports = { publishAccepted, publishRejected, publishDriverLocation };
