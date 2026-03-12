const express = require("express");
const controller = require("../controllers/ride.controller");
const jwt = require("../middlewares/verifyServiceToken")
const router = express.Router();

router.post("/", controller.createRide);
router.put("/:rideId/status", jwt,controller.updateStatus);

module.exports = router;
