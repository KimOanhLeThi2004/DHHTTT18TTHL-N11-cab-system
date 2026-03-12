const { producer } = require("./kafka");

async function publishAccepted(bookingId, driverId) {
    await producer.connect();
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
    await producer.connect();
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

module.exports = { publishAccepted, publishRejected };
