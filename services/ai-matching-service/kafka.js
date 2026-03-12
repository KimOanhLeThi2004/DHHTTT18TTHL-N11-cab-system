const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "ai-matching-service",
  brokers: ["localhost:9092"]
});

const consumer = kafka.consumer({ groupId: "ai-matching-group" });
const producer = kafka.producer();

module.exports = { kafka, consumer, producer };
