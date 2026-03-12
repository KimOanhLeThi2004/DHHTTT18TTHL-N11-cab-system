require("dotenv").config();

const express = require("express");
const sequelize = require("./config/database");
const reviewRoutes = require("./routes/review.routes");

const app = express();
app.use(express.json());

app.use("/reviews", reviewRoutes);

const PORT = process.env.PORT ;

sequelize
  .sync()
  .then(() => {
    console.log("Review DB connected");
    app.listen(PORT, () => {
      console.log(`🚀 Review Service running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("DB connection error:", err);
  });
