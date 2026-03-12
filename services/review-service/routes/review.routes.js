const express = require("express");
const router = express.Router();
const controller = require("../controllers/review.controller");

router.post("/", controller.createReview);
router.get("/driver/:driverId", controller.getDriverReviews);
router.get("/driver/:driverId/rating", controller.getDriverRating);

module.exports = router;
