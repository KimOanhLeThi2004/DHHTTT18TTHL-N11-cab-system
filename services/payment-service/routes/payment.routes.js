const express = require("express");
const { pay, getDriverRevenue } = require("../controllers/payment.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/pay", authMiddleware, pay);
router.get("/driver/total", authMiddleware, getDriverRevenue);

module.exports = router;
