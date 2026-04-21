const { Kafka } = require('kafkajs');

const KAFKA_CONNECTION_TIMEOUT_MS = Number(process.env.KAFKA_CONNECTION_TIMEOUT_MS || 1000);
const KAFKA_REQUEST_TIMEOUT_MS = Number(process.env.KAFKA_REQUEST_TIMEOUT_MS || 2000);
const KAFKA_RETRY_INITIAL_MS = Number(process.env.KAFKA_RETRY_INITIAL_MS || 300);
const KAFKA_RETRY_COUNT = Number(process.env.KAFKA_RETRY_COUNT || 1);

const kafka = new Kafka({
  clientId: 'booking-service',
  brokers: process.env.KAFKA_BROKERS.split(','),
  connectionTimeout: KAFKA_CONNECTION_TIMEOUT_MS,
  requestTimeout: KAFKA_REQUEST_TIMEOUT_MS,
  retry: {
    initialRetryTime: KAFKA_RETRY_INITIAL_MS,
    retries: KAFKA_RETRY_COUNT,
  },
});

const producer = kafka.producer();
let producerConnected = false;

async function ensureConnected() {
  if (producerConnected) return;
  await producer.connect();
  producerConnected = true;
}

async function emitEvent(topic, payload) {
  await ensureConnected();
  await producer.send({
    topic,
    messages: [{ value: JSON.stringify(payload) }]
  });
}

module.exports = { producer, emitEvent, ensureConnected };
