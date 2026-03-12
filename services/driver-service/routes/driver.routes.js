const express = require("express");
const controller = require("../controllers/driver.controller");
const verifyServiceJwt = require("../middlewares/verifyServiceJwt");
const userIdJWT = require("../middlewares/userIdJWT");
const router = express.Router();

router.post("/", controller.createDriver);
router.post("/online", controller.online);
router.post("/offline", controller.offline);
router.get("/nearby", controller.nearby);
router.post("/accept", userIdJWT,controller.acceptRide);
router.post("/reject", userIdJWT, controller.rejectRide);
router.get("/me",userIdJWT, controller.getDriverById_me);
router.get("/:id", verifyServiceJwt, controller.getDriverById);

module.exports = router;
