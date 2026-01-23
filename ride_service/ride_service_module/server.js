import "dotenv/config";

import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import { createClient } from "redis";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3003;
const MONGO_URL = process.env.MONGO_URL;
const MONGO_DB = process.env.MONGO_DB || "ride_db";
const REDIS_URL = process.env.REDIS_URL;

// ===== Mongo =====
const mongo = new MongoClient(MONGO_URL);
await mongo.connect();
const db = mongo.db(MONGO_DB);
const rides = db.collection("rides");

// index (khuyên có)
await rides.createIndex({ userId: 1, createdAt: -1 });

console.log("✅ Mongo connected");

// ===== Redis =====
const redis = createClient({ url: REDIS_URL });
redis.on("error", (e) => console.error("Redis error:", e));
await redis.connect();
console.log("✅ Redis connected");

// ===== Routes =====
app.get("/health", (_req, res) => res.json({ ok: true, service: "ride-service" }));

// Create ride
app.post("/rides", async (req, res) => {
  const userId = req.headers["x-user-id"] || "test-user";
  const { origin, destination, priceEstimate } = req.body || {};

  if (!origin || !destination || priceEstimate == null) {
    return res.status(400).json({ error: "origin + destination + priceEstimate required" });
  }

  const doc = {
    userId,
    origin,
    destination,
    priceEstimate: Number(priceEstimate),
    status: "CREATED",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const r = await rides.insertOne(doc);
  const ride = { ...doc, _id: r.insertedId };

  // cache 60s
  await redis.set(`ride:${ride._id.toString()}`, JSON.stringify(ride), { EX: 600 });

  res.status(201).json(ride);
});

// Get ride (prefer cache)
app.get("/rides/:id", async (req, res) => {
  const id = req.params.id;

  const cached = await redis.get(`ride:${id}`);
  if (cached) return res.json({ ...JSON.parse(cached), cached: true });

  let oid;
  try {
    oid = new ObjectId(id);
  } catch {
    return res.status(400).json({ error: "invalid id" });
  }

  const ride = await rides.findOne({ _id: oid });
  if (!ride) return res.status(404).json({ error: "not found" });

  res.json(ride);
});

// Update status
app.patch("/rides/:id/status", async (req, res) => {
  const id = req.params.id;
  const { status } = req.body || {};
  if (!status) return res.status(400).json({ error: "status required" });

  let oid;
  try {
    oid = new ObjectId(id);
  } catch {
    return res.status(400).json({ error: "invalid id" });
  }

  const r = await rides.findOneAndUpdate(
    { _id: oid },
    { $set: { status, updatedAt: new Date() } },
    { returnDocument: "after" }
  );

  if (!r.value) return res.status(404).json({ error: "not found" });

  // refresh cache
  await redis.set(`ride:${id}`, JSON.stringify(r.value), { EX: 600 });

  res.json(r.value);
});

app.listen(PORT, () => console.log(`🚗 Ride Service running at http://localhost:${PORT}`));
