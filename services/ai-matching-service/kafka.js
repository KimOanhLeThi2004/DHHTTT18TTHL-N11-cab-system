const { Kafka } = require("kafkajs");

const brokers = (process.env.KAFKA_BROKERS || "localhost:9092")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const kafka = new Kafka({
  clientId: "ai-matching-service",
  brokers
});

const consumer = kafka.consumer({ groupId: "ai-matching-group" });
const producer = kafka.producer();

module.exports = { kafka, consumer, producer };
