const { producer } = require('./kafka')
let connected = false;

async function initProducer() {
  if (connected) return;
  await producer.connect();
  connected = true;
  console.log("Kafka producer connected");
}

async function publishRideStatusChanged(ride) {
  await initProducer();
  await producer.send({
    topic: "ride.status.changed",
    messages: [
      {
        key: ride._id.toString(),
        value: JSON.stringify({
          rideId: ride._id,
          userId: ride.user?.id,
          bookingId: ride.bookingId,
          driverId: ride.driver?.id,
          driver: ride.driver || null,
          pickup: ride.pickup || null,
          dropoff: ride.dropoff || null,
          status: ride.status,
          updatedAt: ride.updatedAt
        })
      }
    ]
  });
}

module.exports = {
  initProducer,
  publishRideStatusChanged
};
