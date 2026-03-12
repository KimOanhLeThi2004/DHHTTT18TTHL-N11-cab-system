const { Kafka } = require("kafkajs");
require("dotenv").config();

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID,
  brokers: [process.env.KAFKA_BROKER]
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: "ride-service" });

module.exports = {producer, consumer}