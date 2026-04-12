const { Driver } = require("../models/driver.model");
const service = require("../services/driver.service");
const { publishAccepted, publishRejected } = require("../services/eventProducer");
const { redis } = require("../db/redis");

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function createDriver(req, res) {
  try {
    const { id, name, phone, vehicleType = "CAR" } = req.body;
    if (!id || !name) {
      return res.status(400).json({ message: "id and name are required" });
    }

    const existed = await Driver.findByPk(id);
    if (existed) {
      return res.status(200).json(existed);
    }

    const driver = await Driver.create({
      id,
      name,
      phone,
      vehicleType,
    });

    return res.status(201).json(driver);
  } catch (error) {
    return res.status(500).json({
      message: "Cannot create driver",
      error: error.message,
    });
  }
}

async function online(req, res) {
  try {
    const { driverId, lat, lng, vehicleType } = req.body;
    const parsedLat = toNumber(lat);
    const parsedLng = toNumber(lng);
    if (!driverId || parsedLat === null || parsedLng === null) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    await service.setDriverOnline(driverId, parsedLat, parsedLng, vehicleType);
    return res.json({ status: "ONLINE" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function offline(req, res) {
  try {
    const { driverId } = req.body;
    if (!driverId) {
      return res.status(400).json({ message: "Missing driverId" });
    }

    await service.setDriverOffline(driverId);
    return res.json({ status: "OFFLINE" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function nearby(req, res) {
  try {
    const { lat, lng, radiusKm = 5, vehicleType = "CAR" } = req.query;
    const parsedLat = toNumber(lat);
    const parsedLng = toNumber(lng);
    if (parsedLat === null || parsedLng === null) {
      return res.status(400).json({ message: "lat and lng are required" });
    }
    const drivers = await service.findNearbyDrivers(parsedLat, parsedLng, Number(radiusKm), vehicleType);
    return res.json(drivers);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function acceptRide(req, res) {
  try {
    const { bookingId } = req.body;
    const driverId = req.user.userId;
    if (!bookingId) {
      return res.status(400).json({ message: "bookingId is required" });
    }

    const assignment = await redis.get(`assignment:${bookingId}`);
    if (!assignment) {
      return res.status(400).json({ message: "Assignment expired or not found" });
    }

    const parsed = JSON.parse(assignment);
    if (parsed.driverId !== driverId) {
      return res.status(403).json({ message: "Not your assignment" });
    }

    await redis.set(
      `active_assignment:${driverId}`,
      JSON.stringify({
        bookingId,
        userId: parsed.userId || null,
      }),
      "EX",
      3600
    );

    await redis.del(`assignment:${bookingId}`);
    await publishAccepted(bookingId, driverId);
    return res.json({ message: "Accepted successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function rejectRide(req, res) {
  try {
    const { bookingId, reason = "driver_rejected" } = req.body;
    const driverId = req.user.userId;
    if (!bookingId) {
      return res.status(400).json({ message: "bookingId is required" });
    }

    await publishRejected(bookingId, driverId, reason);
    return res.json({ message: "Rejected" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

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
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function getDriverLocation(req, res) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Missing driver id" });
    }

    const data = await redis.hGetAll(`driver:${id}`);
    if (!data || Object.keys(data).length === 0) {
      return res.status(404).json({ message: "Driver location not found" });
    }

    return res.json({
      driverId: id,
      status: data.status || "OFFLINE",
      vehicleType: data.vehicleType || null,
      lat: Number(data.lat),
      lng: Number(data.lng),
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function getDriverByIdMe(req, res) {
  try {
    const id = req.user.userId;
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
  getDriverById,
  getDriverLocation,
  getDriverById_me: getDriverByIdMe,
};
