const { producer } = require('./kafka')

async function initProducer() {
  console.log("pro")
  await producer.connect();
  console.log("Kafka producer connected");
}

async function publishRideStatusChanged(ride) {
  console.log("hello 1")
  await producer.send({
    topic: "ride.status.changed",
    messages: [
      {
        key: ride._id.toString(),
        value: JSON.stringify({
          rideId: ride._id,
          userId: ride.user.id,
          bookingId: ride.bookingId,
          driverId: ride.driver.id,
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
