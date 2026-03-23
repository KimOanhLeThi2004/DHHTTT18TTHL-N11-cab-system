const express = require("express");
const { createReview } = require("../services/review.service");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const token = req.headers.authorization;
    const payload = req.body;
    const data = await createReview(payload, token);
    res.status(201).json(data);
  } catch (error) {
    console.error("Review error:", error.message);
    res.status(500).json({ message: "Create review failed" });
  }
});

module.exports = router;
