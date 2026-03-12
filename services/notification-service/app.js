require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const startConsumer = require("./kafka/consumer");
const initWebSocket = require("./ws.server");

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error(err));

app.use("/notifications", require("./routes/notification.routes"));

const server = http.createServer(app);

// ✅ Khởi tạo WebSocket SAU khi có server
const { sendToUser } = initWebSocket(server);

// ✅ Truyền sendToUser cho consumer
startConsumer(sendToUser).catch(console.error);

server.listen(process.env.PORT, () => {
  console.log(`Notification Service running on port ${process.env.PORT}`);
});