// services/osrm.js
export async function getRouteInfo(from, to, vehicle) {
  const profile = vehicle === "motorbike" ? "bike" : "car";

  const url = `https://router.project-osrm.org/route/v1/${profile}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.routes?.length) {
    throw new Error("Không lấy được tuyến đường");
  }

  const route = data.routes[0];

  return {
    distanceKm: (route.distance / 1000).toFixed(2),
    durationMin: Math.ceil(route.duration / 60),
  };
}

export async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;

  const res = await fetch(url);
  const data = await res.json();

  return data.display_name;
}