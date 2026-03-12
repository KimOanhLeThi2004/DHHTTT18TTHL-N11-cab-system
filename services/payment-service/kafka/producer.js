const { Kafka } = require("kafkajs");
require("dotenv").config();

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID,
  brokers: [process.env.KAFKA_BROKER]
});

const producer = kafka.producer();

async function initProducer() {
  await producer.connect();
  console.log("Kafka producer connected");
}

async function publishPaymentSuccess(payment) {
  await producer.send({
    topic: "payment.success",
    messages: [
      {
        key: payment.bookingId,
        value: JSON.stringify({
          paymentId: payment.id,
          bookingId: payment.bookingId,
          userId: payment.userId,
          amount: payment.amount,
          status: "SUCCESS"
        })
      }
    ]
  });
}

module.exports = {
  initProducer,
  publishPaymentSuccess
};
