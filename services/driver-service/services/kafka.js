const { Kafka } = require("kafkajs");
require("dotenv").config();

const brokers = (process.env.KAFKA_BROKERS || process.env.KAFKA_BROKER || "localhost:9092")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const kafka = new Kafka({
  clientId: "driver-service",
  brokers,
});

const producer = kafka.producer();
const consumer = kafka.consumer({
  groupId: "driver-group",
});

module.exports = { producer, consumer };
