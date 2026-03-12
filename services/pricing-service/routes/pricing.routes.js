const express = require('express');
const router = express.Router();
const pricingService = require('../services/pricing.service');

router.post('/calculate', (req, res) => {
  try {
    const result = pricingService.calculatePrice(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
