const express = require("express");
const paymentRoutes = require("./routes/payment.routes");
const { sequelize } = require("./db/postgres");
const { initProducer } = require("./kafka/producer");
require("dotenv").config();

const app = express();
app.use(express.json());

app.use("/payments", paymentRoutes);

(async () => {
  try {
    await sequelize.sync({alter: true });
    await initProducer();

    app.listen(process.env.PORT, () => {
      console.log(`Payment Service running on port ${process.env.PORT}`);
    });
  } catch (err) {
    console.error("Startup error:", err);
  }
})();
