const { Driver } = require("../models/driver.model");
const service = require("../services/driver.service");
const {
  publishAccepted,
  publishRejected,
} = require("../services/eventProducer");

const {redis}  = require("../db/redis"); // 👈 nhớ import redis client

/* ================= CREATE DRIVER ================= */
async function createDriver(req, res) {
  try {
    console.log(req.body)
    const driver = await Driver.create(req.body);
    
    return res.status(201).json(driver);
  } catch (error) {
    console.error("CREATE DRIVER ERROR:", error);
    return res.status(500).json({
      message: "Cannot create driver",
      error: error.message,
    });
  }
}

/* ================= ONLINE ================= */
async function online(req, res) {
  try {
    const { driverId, lat, lng } = req.body;

    if (!driverId || !lat || !lng) {
      return res.status(400).json({ message: "Missing fields" });
    }

    await service.setDriverOnline(driverId, lat, lng);

    return res.json({ status: "ONLINE" });
  } catch (error) {
    console.error("ONLINE ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
}

/* ================= OFFLINE ================= */
async function offline(req, res) {
  try {
    const { driverId } = req.body;

    if (!driverId) {
      return res.status(400).json({ message: "Missing driverId" });
    }

    await service.setDriverOffline(driverId);

    return res.json({ status: "OFFLINE" });
  } catch (error) {
    console.error("OFFLINE ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
}

/* ================= NEARBY ================= */
async function nearby(req, res) {
  try {
    const drivers = await service.findNearbyDrivers();
    return res.json(drivers);
  } catch (error) {
    console.error("NEARBY ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
}

/* ================= ACCEPT RIDE ================= */
async function acceptRide(req, res) {
  try {
    const { bookingId } = req.body;
    const driverId = req.user.userId;
    const assignment = await redis.get(`assignment:${bookingId}`);

    if (!assignment) {
      return res.status(400).json({
        message: "Assignment expired or not found",
      });
    }

    const parsed = JSON.parse(assignment);

    if (parsed.driverId !== driverId) {
      return res.status(403).json({
        message: "Not your assignment",
      });
    }

    // Xóa assignment (đảm bảo idempotent)
    await redis.del(`assignment:${bookingId}`);

    // Publish event
    await publishAccepted(bookingId, driverId);

    return res.json({ message: "Accepted successfully" });
  } catch (error) {
    console.error("ACCEPT ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
}

/* ================= REJECT RIDE ================= */
async function rejectRide(req, res) {
  try {
    const { bookingId, driverId } = req.body;

    await publishRejected(bookingId, driverId);

    return res.json({ message: "Rejected" });
  } catch (error) {
    console.error("REJECT ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
}

/* ================= REJECT RIDE ================= */
async function getDriverById(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Missing driver id" });
    }

    const driver = await Driver.findByPk(id);

    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    return res.json({
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
      vehicleType: driver.vehicleType,
    });
  } catch (error) {
    console.error("GET DRIVER BY ID ERROR:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function getDriverById_me(req, res) {
  try {
    const  id  = req.user.userId;

    if (!id) {
      return res.status(400).json({ message: "Missing driver id" });
    }

    const driver = await Driver.findByPk(id);

    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    return res.json({
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
      vehicleType: driver.vehicleType,
    });
  } catch (error) {
    console.error("GET DRIVER BY ID ERROR:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
module.exports = {
  createDriver,
  online,
  offline,
  nearby,
  acceptRide,
  rejectRide,
  getDriverById, getDriverById_me
};
