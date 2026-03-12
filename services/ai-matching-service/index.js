const { consumer, producer } = require("./kafka");
const {
  findNearbyDrivers,
  reserveDriver
} = require("./driverRepository");
const calculateScore = require("./scoring");

async function start() {
  await consumer.connect();
  await producer.connect();

  await consumer.subscribe({ topic: "BOOKING_CREATED" });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const trip = JSON.parse(message.value.toString());
      console.log(trip)
      console.log("Received trip:", trip.bookingId);

      const drivers = await findNearbyDrivers(
        trip.pickup.lat,
        trip.pickup.lng,
        trip.vehicleType
      );

      if (!drivers.length) {
        console.log("No drivers found");
        return;
      }

      // Calculate score
      const scoredDrivers = drivers.map(d => ({
        ...d,
        score: calculateScore(d, trip)
      }));

      // Sort by score desc
      scoredDrivers.sort((a, b) => b.score - a.score);

      for (let driver of scoredDrivers) {
        const locked = await reserveDriver(driver.id);
        if (locked) {
          console.log("Assigned driver:", driver.id);

          await producer.send({
            topic: "driver.assigned.requested",
            messages: [
              {
                value: JSON.stringify({
                  bookingId: trip.bookingId,
                  driverId: driver.id,
                  pickup: trip.pickup,
                  dropoff: trip.dropoff,
                  price: trip.estimatedPrice
                })
              }
            ]
          });

          break;
        }
      }
    }
  });
}

start();
