const express = require("express");
const router = express.Router();
const { calculatePrice } = require("../services/pricing.service");

router.post("/calculate", async (req, res) => {
  try {
    const payload = req.body;

    const data = await calculatePrice(payload);

    res.json(data);
  } catch (error) {
    console.error("Pricing error:", error.message);

    res.status(500).json({
      message: "Cannot calculate price",
      error: error.message
    });
  }
});

module.exports = router;