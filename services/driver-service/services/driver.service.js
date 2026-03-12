const { redis } = require("../db/redis");

async function setDriverOnline(driverId, lat, lng, vehicleType) {
  await redis.hSet(`driver:${driverId}`, {
    status: "ONLINE",
    lat,
    lng, vehicleType
  });

  const geoKey = `drivers:geo:${vehicleType}`;
  // Thêm dòng này
  await redis.geoAdd(geoKey, {
    longitude: lng,
    latitude: lat,
    member: driverId
  });
}


async function setDriverOffline(driverId) {
  await redis.del(`driver:${driverId}`);
  await redis.zRem("drivers:geo", driverId);
}


async function findNearbyDrivers(lat, lng, radiusKm = 5) {
  const results = await redis.geoRadius(
    "drivers:geo",
    lng,
    lat,
    radiusKm,
    "km",
    "WITHDIST"
  );

  const drivers = [];

  for (const [driverId, distance] of results) {
    const data = await redis.hGetAll(`driver:${driverId}`);

    if (data.status === "ONLINE") {
      drivers.push({
        id: driverId,
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lng),
        distanceKm: parseFloat(distance)
      });
    }
  }

  return drivers;
}


module.exports = {
  setDriverOnline,
  setDriverOffline,
  findNearbyDrivers
};
