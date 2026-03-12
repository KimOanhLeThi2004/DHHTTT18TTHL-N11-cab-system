const express = require("express");
const bodyParser = require("body-parser");
const authMiddleware = require("./middlewares/auth.middleware");
const bookingRoute = require("./routes/booking.route");
const authRoute = require('./routes/auth.route');
const userRoute = require("./routes/user.route");
const driverRoute = require("./routes/driver.route");
const pricingRoute = require("./routes/pricing.route");
const rideRoute = require("./routes/ride.route")
const cors = require("cors");
const { PORT } = require("./config");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Gateway verify via Auth Service
app.use("/booking", authMiddleware, bookingRoute);
app.use("/auth",  authRoute);
app.use("/users", userRoute);
app.use("/drivers", driverRoute);
app.use("/pricing", pricingRoute);
app.use("/rides", rideRoute);
app.get("/health", (_, res) => res.send("OK"));

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
