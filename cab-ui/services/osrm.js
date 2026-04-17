// services/osrm.js
const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";

function toFiniteNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function formatAddressFromNominatim(payload = {}) {
  const address = payload.address || {};
  const line1 = [address.house_number, address.road].filter(Boolean).join(" ").trim();
  const ward = address.suburb || address.quarter || address.city_district || null;
  const district = address.county || address.town || address.city || null;
  const province = address.state || address.region || null;
  const country = address.country || null;

  const parts = [line1, ward, district, province, country]
    .map((item) => (item ? String(item).trim() : ""))
    .filter(Boolean);

  if (parts.length > 0) {
    return parts.join(", ");
  }

  if (payload.display_name) {
    return String(payload.display_name).trim();
  }

  return "Khong xac dinh duoc dia chi";
}

export async function getRouteInfo(from, to, vehicle) {
  const profile = vehicle === "motorbike" ? "bike" : "car";
  const fromLat = toFiniteNumber(from?.lat);
  const fromLng = toFiniteNumber(from?.lng);
  const toLat = toFiniteNumber(to?.lat);
  const toLng = toFiniteNumber(to?.lng);

  if (fromLat === null || fromLng === null || toLat === null || toLng === null) {
    throw new Error("Toa do khong hop le");
  }

  const url = `https://router.project-osrm.org/route/v1/${profile}/${fromLng},${fromLat};${toLng},${toLat}?overview=false`;
  const res = await fetch(url);
  const data = await res.json();

  if (!data.routes?.length) {
    throw new Error("Khong lay duoc tuyen duong");
  }

  const route = data.routes[0];
  return {
    distanceKm: (route.distance / 1000).toFixed(2),
    durationMin: Math.ceil(route.duration / 60),
  };
}

export async function searchPlaces(query, limit = 5) {
  const text = String(query || "").trim();
  if (!text) return [];

  const params = new URLSearchParams({
    format: "jsonv2",
    q: text,
    limit: String(Math.max(1, Math.min(10, Number(limit) || 5))),
    addressdetails: "1",
    countrycodes: "vn",
    "accept-language": "vi",
  });

  const res = await fetch(`${NOMINATIM_BASE_URL}/search?${params.toString()}`);
  const data = await res.json();
  if (!Array.isArray(data)) return [];

  return data
    .map((item) => {
      const lat = toFiniteNumber(item?.lat);
      const lng = toFiniteNumber(item?.lon);
      if (lat === null || lng === null) return null;

      const displayName = String(item?.display_name || "").trim();
      const address = formatAddressFromNominatim(item);
      return {
        placeId: item?.place_id || `${lat}:${lng}`,
        displayName: displayName || address,
        address,
        lat,
        lng,
      };
    })
    .filter(Boolean);
}

export async function reverseGeocode(lat, lng) {
  const normalizedLat = toFiniteNumber(lat);
  const normalizedLng = toFiniteNumber(lng);
  if (normalizedLat === null || normalizedLng === null) {
    return "Khong xac dinh duoc dia chi";
  }

  try {
    const params = new URLSearchParams({
      format: "jsonv2",
      lat: String(normalizedLat),
      lon: String(normalizedLng),
      zoom: "18",
      addressdetails: "1",
      "accept-language": "vi",
    });

    const res = await fetch(`${NOMINATIM_BASE_URL}/reverse?${params.toString()}`);
    const data = await res.json();
    return formatAddressFromNominatim(data);
  } catch (_) {
    return "Khong xac dinh duoc dia chi";
  }
}
