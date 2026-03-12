function calculateScore(driver, trip) {
  return (
    -0.6 * driver.distanceKm +
    2.0 * driver.acceptRate +
    1.5 * driver.rating -
    0.3 * driver.eta
  );
}

module.exports = calculateScore;
