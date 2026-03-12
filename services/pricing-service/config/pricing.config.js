module.exports = {
  VEHICLE_TYPES: {
    BIKE: {
      baseFare: 10000,
      pricePerKm: 8000,
      pricePerMin: 1000
    },
    CAR: {
      baseFare: 20000,
      pricePerKm: 10000,
      pricePerMin: 2000
    }
  },

  SURGE_RULES: [
    {
      startHour: 7,
      endHour: 9,
      multiplier: 1.5
    },
    {
      startHour: 17,
      endHour: 19,
      multiplier: 1.7
    }
  ]
};
