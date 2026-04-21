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
  const normalizedVehicleType = String(vehicleType || "CAR").toUpperCase();
  const key = `drivers:geo:${normalizedVehicleType}`;
  const results = await redis.sendCommand([
    "GEOSEARCH",
    key,
    "FROMLONLAT",
    String(Number(lng)),
    String(Number(lat)),
    "BYRADIUS",
    String(Number(radiusKm)),
    "km",
    "WITHDIST",
  ]);

  const drivers = [];
  for (const row of results || []) {
    const [driverId, distance] = Array.isArray(row) ? row : [];
    if (!driverId) continue;
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
