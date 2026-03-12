const redis = require("./redis");

async function findNearbyDrivers(lat, lng,  vehicleType, radiusKm = 5) {

  const geoKey = `drivers:geo:${vehicleType}`;

  const results = await redis.georadius(
    geoKey,
    lng,
    lat,
    radiusKm,
    "km",
    "WITHDIST"
  );

  const drivers = [];

  for (const [id, distance] of results) {
    const driver = await redis.hgetall(`driver:${id}`);

    drivers.push({
      id,
      distanceKm: parseFloat(distance),
      vehicleType: driver.vehicleType,
      rating: 4.8,
      acceptRate: 0.9,
      eta: 3
    });
  }

  return drivers;
}

async function reserveDriver(driverId) {
  // Giả lập atomic lock bằng Redis
  const result = await redis.set(
    `driver:${driverId}:lock`,
    "BUSY",
    "NX",
    "EX",
    30
  );

  return result === "OK";
}

module.exports = {
  findNearbyDrivers,
  reserveDriver
};
