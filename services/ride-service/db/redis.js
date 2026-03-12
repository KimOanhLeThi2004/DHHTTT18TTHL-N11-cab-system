const { createClient } = require("redis");
require("dotenv").config();

const redis = createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  }
});

redis.on("error", err => console.error("Redis error", err));

(async () => {
  await redis.connect();
  console.log("Redis connected");
})();

module.exports = { redis };
