require("dotenv").config();

const express = require("express");
const sequelize = require("./config/database");
const reviewRoutes = require("./routes/review.routes");
const { startServer } = require("./mtls");

const app = express();
app.use(express.json());

app.use("/reviews", reviewRoutes);

const PORT = process.env.PORT;

sequelize
  .sync()
  .then(() => {
    console.log("Review DB connected");
    startServer(app, PORT, "review-service", ({ protocol, port }) => {
      console.log(`Review Service running on ${protocol}://0.0.0.0:${port}`);
    });
  })
  .catch((err) => {
    console.error("DB connection error:", err);
  });
