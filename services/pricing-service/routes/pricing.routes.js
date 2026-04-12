const express = require('express');
const router = express.Router();
const pricingService = require('../services/pricing.service');

router.post('/calculate', (req, res) => {
  try {
    const result = pricingService.calculatePrice(req.body);
    res.json(result);
  } catch (err) {
    const status = err.message.includes("must be") ? 422 : 400;
    res.status(status).json({ message: err.message });
  }
});

router.post('/eta', (req, res) => {
  try {
    const distanceKm = Number(req.body.distanceKm ?? req.body.distance_km ?? 0);
    const trafficLevel = Number(req.body.trafficLevel ?? req.body.traffic_level ?? 0.5);
    if (!Number.isFinite(distanceKm) || distanceKm < 0) {
      return res.status(422).json({ message: "distance_km must be a non-negative number" });
    }
    const eta = pricingService.calculateEtaMinutes(distanceKm, trafficLevel);
    return res.json({ eta, modelVersion: "eta-v1" });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

module.exports = router;
