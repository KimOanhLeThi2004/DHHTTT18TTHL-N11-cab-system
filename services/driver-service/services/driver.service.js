const { redis } = require("../db/redis");

async function setDriverOnline(driverId, lat, lng, vehicleType) {
  const finalVehicleType = vehicleType || "CAR";
  await redis.hSet(`driver:${driverId}`, {
    status: "ONLINE",
    lat: Number(lat),
    lng: Number(lng),
    vehicleType: finalVehicleType,
  });

  const geoKey = `drivers:geo:${finalVehicleType}`;
  await redis.geoAdd(geoKey, {
    longitude: Number(lng),
    latitude: Number(lat),
    member: driverId,
  });
}

async function setDriverOffline(driverId) {
  const data = await redis.hGetAll(`driver:${driverId}`);
  await redis.del(`driver:${driverId}`);
  if (data?.vehicleType) {
    await redis.zRem(`drivers:geo:${data.vehicleType}`, driverId);
  }
}

async function findNearbyDrivers(lat, lng, radiusKm = 5, vehicleType = "CAR") {
  const results = await redis.geoRadius(
    `drivers:geo:${vehicleType}`,
    Number(lng),
    Number(lat),
    Number(radiusKm),
    "km",
    "WITHDIST"
  );

  const drivers = [];
  for (const [driverId, distance] of results) {
    const data = await redis.hGetAll(`driver:${driverId}`);
    if (data.status === "ONLINE") {
      drivers.push({
        id: driverId,
        status: data.status,
        vehicleType: data.vehicleType,
        lat: Number(data.lat),
        lng: Number(data.lng),
        distanceKm: Number(distance),
      });
    }
  }
  return drivers;
}

module.exports = {
  setDriverOnline,
  setDriverOffline,
  findNearbyDrivers,
};
