const express = require("express");
const controller = require("../controllers/ride.controller");
const jwt = require("../middlewares/verifyServiceToken")
const router = express.Router();

router.post("/", controller.createRide);
router.get("/booking/:bookingId", jwt, controller.getRideByBookingId);
router.put("/:rideId/status", jwt, controller.updateStatus);

module.exports = router;
