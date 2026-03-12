const express = require("express");
const router = express.Router();

const driverService = require("../services/driver.service");

/* ================= ACCEPT RIDE ================= */
router.post("/accept", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    console.log(token)
    const result = await driverService.acceptRide(req.body, token);

    return res.json(result);
  } catch (error) {
    console.error("Gateway ACCEPT ERROR:", error);
    return res.status(error.status || 500).json(error);
  }
});

/* ================= REJECT RIDE ================= */
router.post("/reject", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    const result = await driverService.rejectRide(req.body, token);

    return res.json(result);
  } catch (error) {
    console.error("Gateway REJECT ERROR:", error);
    return res.status(error.status || 500).json(error);
  }
});

router.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    const result = await driverService.getDriver(token);

    return res.json(result);
  } catch (error) {
    console.error("Gateway REJECT ERROR:", error);
    return res.status(error.status || 500).json(error);
  }
});

module.exports = router;