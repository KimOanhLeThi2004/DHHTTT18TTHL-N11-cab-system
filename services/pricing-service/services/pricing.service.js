const { VEHICLE_TYPES, SURGE_RULES } = require("../config/pricing.config");

function getSurgeMultiplierByTime(date) {
  const hour = new Date(date).getHours();

  const rule = SURGE_RULES.find((r) => hour >= r.startHour && hour < r.endHour);
  return rule ? rule.multiplier : 1;
}

function normalizePayload(payload) {
  return {
    vehicleType: payload.vehicleType || payload.vehicle_type || "CAR",
    distanceKm: Number(payload.distanceKm ?? payload.distance_km ?? 0),
    durationMin: Number(payload.durationMin ?? payload.duration_min ?? 0),
    requestTime: payload.requestTime || payload.request_time || new Date().toISOString(),
    demandIndex: Number(payload.demandIndex ?? payload.demand_index ?? 1),
    supplyIndex: Number(payload.supplyIndex ?? payload.supply_index ?? 1),
    trafficLevel: Number(payload.trafficLevel ?? payload.traffic_level ?? 0.5),
  };
}

function calculateEtaMinutes(distanceKm, trafficLevel) {
  const safeDistance = Number.isFinite(distanceKm) ? Math.max(0, distanceKm) : 0;
  const safeTraffic = Number.isFinite(trafficLevel) ? Math.max(0, trafficLevel) : 0.5;
  const avgSpeedKmPerHour = Math.max(10, 30 - safeTraffic * 15);
  if (safeDistance === 0) return 0;
  return Math.max(1, Math.round((safeDistance / avgSpeedKmPerHour) * 60));
}

function calculatePrice(rawPayload) {
  const payload = normalizePayload(rawPayload);
  const config = VEHICLE_TYPES[payload.vehicleType];
  if (!config) {
    throw new Error("Invalid vehicle type");
  }

  if (!Number.isFinite(payload.distanceKm) || payload.distanceKm < 0) {
    throw new Error("distanceKm must be a non-negative number");
  }

  if (!Number.isFinite(payload.durationMin) || payload.durationMin < 0) {
    throw new Error("durationMin must be a non-negative number");
  }

  if (!Number.isFinite(payload.demandIndex) || payload.demandIndex < 0) {
    throw new Error("demandIndex must be a non-negative number");
  }

  if (!Number.isFinite(payload.supplyIndex) || payload.supplyIndex < 0) {
    throw new Error("supplyIndex must be a non-negative number");
  }

  const baseFare = config.baseFare;
  const distanceFare = payload.distanceKm * config.pricePerKm;
  const timeFare = payload.durationMin * config.pricePerMin;
  const timeSurge = getSurgeMultiplierByTime(payload.requestTime);
  const supplySafe = Math.max(1, payload.supplyIndex || 1);
  const demandSurge = payload.demandIndex === 0 ? 1 : payload.demandIndex / supplySafe;
  const surgeMultiplier = Math.max(1, timeSurge, demandSurge);
  const etaMin = calculateEtaMinutes(payload.distanceKm, payload.trafficLevel);

  const totalPrice = Math.max(
    baseFare,
    Math.round((baseFare + distanceFare + timeFare) * surgeMultiplier)
  );

  return {
    baseFare,
    distanceFare,
    timeFare,
    surgeMultiplier,
    totalPrice,
    etaMin,
    modelVersion: "pricing-v2",
  };
}

module.exports = {
  calculatePrice,
  calculateEtaMinutes,
};
