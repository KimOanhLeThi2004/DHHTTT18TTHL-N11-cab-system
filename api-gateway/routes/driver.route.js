const express = require("express");
const router = express.Router();

const driverService = require("../services/driver.service");

/* ================= ACCEPT RIDE ================= */
router.post("/accept", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Missing token" });
    }
    const result = await driverService.acceptRide(req.body, token);

    return res.json(result);
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message });
  }
});

/* ================= REJECT RIDE ================= */
router.post("/reject", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Missing token" });
    }

    const result = await driverService.rejectRide(req.body, token);

    return res.json(result);
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message });
  }
});

router.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Missing token" });
    }

    const result = await driverService.getDriver(token);

    return res.json(result);
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message });
  }
});

module.exports = router;
