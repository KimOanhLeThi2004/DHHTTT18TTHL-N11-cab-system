const { Kafka } = require("kafkajs");

const brokers = (process.env.KAFKA_BROKERS || "localhost:9092")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const KAFKA_GROUP_ID = process.env.KAFKA_GROUP_ID || "ai-matching-group";
const KAFKA_SESSION_TIMEOUT_MS = Math.max(
  6000,
  Number(process.env.KAFKA_SESSION_TIMEOUT_MS || 300000)
);
const KAFKA_REBALANCE_TIMEOUT_MS = Math.max(
  KAFKA_SESSION_TIMEOUT_MS,
  Number(process.env.KAFKA_REBALANCE_TIMEOUT_MS || 300000)
);
const KAFKA_HEARTBEAT_INTERVAL_MS = Math.max(
  1000,
  Number(process.env.KAFKA_HEARTBEAT_INTERVAL_MS || 3000)
);

const kafka = new Kafka({
  clientId: "ai-matching-service",
  brokers
});

const consumer = kafka.consumer({
  groupId: KAFKA_GROUP_ID,
  sessionTimeout: KAFKA_SESSION_TIMEOUT_MS,
  rebalanceTimeout: KAFKA_REBALANCE_TIMEOUT_MS,
  heartbeatInterval: KAFKA_HEARTBEAT_INTERVAL_MS,
});
const producer = kafka.producer();

module.exports = { kafka, consumer, producer };
