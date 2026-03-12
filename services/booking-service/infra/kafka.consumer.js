const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "booking-service",
  brokers: process.env.KAFKA_BROKERS.split(','),
});

const consumer = kafka.consumer({
  groupId: "booking-group",
});

module.exports = { consumer };
