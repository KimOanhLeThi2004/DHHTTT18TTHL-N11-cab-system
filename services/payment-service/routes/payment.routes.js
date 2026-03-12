const express = require("express");
const { pay } = require("../controllers/payment.controller");

const router = express.Router();

router.post("/pay", pay);

module.exports = router;
