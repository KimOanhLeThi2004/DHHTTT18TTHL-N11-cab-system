const mongoose = require("mongoose");
require("dotenv").config();

async function connectMongo() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected");
}

module.exports = { connectMongo };
