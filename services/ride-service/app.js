const express = require("express");
const rideRoutes = require("./routes/ride.routes");
const { connectMongo } = require("./db/mongo");
const { initProducer } = require("./kafka/producer");
const startBookingConfirmedConsumer = require("./kafka/bookingConfirmed.consumer");
require("dotenv").config();

const app = express();
app.use(express.json());

app.use("/rides", rideRoutes);
async function bootstrap() {
  await startBookingConfirmedConsumer();
  console.log("✅ Ride consumer started");
}

bootstrap();

(async () => {
  try {
    await connectMongo();
    await initProducer();

    app.listen(process.env.PORT, () => {
      console.log(`Ride Service running on port ${process.env.PORT}`);
    });
  } catch (err) {
    console.error("Startup error:", err);
  }
})();
