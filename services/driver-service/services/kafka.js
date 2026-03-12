const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "driver-service",
  brokers: ["localhost:9092"],
});

const producer = kafka.producer();
const consumer = kafka.consumer({
  groupId: "driver-group",
});

module.exports = { producer, consumer };
