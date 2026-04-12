const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'booking-service',
  brokers: process.env.KAFKA_BROKERS.split(',')
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
