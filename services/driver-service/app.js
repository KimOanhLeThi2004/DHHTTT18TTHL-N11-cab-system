const express = require("express");
const driverRoutes = require("./routes/driver.routes");
const { sequelize } = require("./db/postgres");
require("dotenv").config();
const startAssignmentConsumer = require('./services/assignmentConsumer')
const setupDriverWS = require("./ws"); 
const http = require("http");


const app = express();
app.use(express.json());

app.use("/drivers", driverRoutes);
startAssignmentConsumer();
(async () => {
  try {
    await sequelize.sync();
    console.log("Postgres connected");

    const server = http.createServer(app);

    // 👇 gắn websocket
    setupDriverWS(server);

    server.listen(process.env.PORT, () => {
      console.log(`Driver Service running on port ${process.env.PORT}`);
      console.log(`Driver WS running on ws://localhost:${process.env.PORT}`);
    });
  } catch (err) {
    console.error("Startup error:", err);
  }
})();
