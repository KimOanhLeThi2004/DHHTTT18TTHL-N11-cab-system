const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'booking-service',
  brokers: process.env.KAFKA_BROKERS.split(',')
});

const producer = kafka.producer();

async function emitEvent(topic, payload) {
  await producer.connect();
  await producer.send({
    topic,
    messages: [{ value: JSON.stringify(payload) }]
  });
}

module.exports = { producer,emitEvent };
