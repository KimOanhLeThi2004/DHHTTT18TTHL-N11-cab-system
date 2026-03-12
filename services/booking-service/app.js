require('dotenv').config();
const express = require('express');
const connectMongo = require('./config/mongo');
const bookingRoutes = require('./routes/booking.routes');
const token = require("./middlewares/auth.middleware");
const start = require('./driverAssignedConsumer');

const app = express();
app.use(express.json());

app.use('/bookings', token,bookingRoutes);

connectMongo().then(() => {
  app.listen(process.env.PORT, () => {
    console.log(`Booking Service running on ${process.env.PORT}`);
  });
});

start()
