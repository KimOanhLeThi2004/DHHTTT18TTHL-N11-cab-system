const { VEHICLE_TYPES, SURGE_RULES } = require('../config/pricing.config');

function getSurgeMultiplier(date) {
  const hour = new Date(date).getHours();

  const rule = SURGE_RULES.find(
    r => hour >= r.startHour && hour < r.endHour
  );

  return rule ? rule.multiplier : 1;
}

function calculatePrice({ vehicleType, distanceKm, durationMin, requestTime }) {
  const config = VEHICLE_TYPES[vehicleType];
  if (!config) {
    throw new Error('Invalid vehicle type');
  }

  const baseFare = config.baseFare;
  const distanceFare = distanceKm * config.pricePerKm;
  const timeFare = durationMin * config.pricePerMin;

  const surgeMultiplier = getSurgeMultiplier(requestTime);

  const totalPrice = Math.round(
    (baseFare + distanceFare + timeFare) * surgeMultiplier
  );

  return {
    baseFare,
    distanceFare,
    timeFare,
    surgeMultiplier,
    totalPrice
  };
}

module.exports = {
  calculatePrice
};
