const WebSocket = require("ws");
const jwt = require("jsonwebtoken");

const clients = new Map();

const initWebSocket = (server) => {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", (ws, req) => {
     console.log("Incoming WS connection...");
    try {
      const url = new URL(req.url, "http://localhost:3008");
      const token = url.searchParams.get("token");

      console.log("Token received:", token);

        const payload = jwt.verify(token, process.env.JWT_SECRETKEY);
        console.log("Token decoded:", payload);

        const userId = payload.userId;
        console.log("User connected:", userId);
      

      clients.set(userId, ws);

      ws.on("close", () => {
        clients.delete(userId);
      });

    } catch (err) {
      ws.close();
    }
  });

  const sendToUser = (userId, payload) => {
    const ws = clients.get(userId);

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  };

  return { sendToUser };
};

module.exports = initWebSocket;