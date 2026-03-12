const { Payment } = require("../models/payment.model");
const { publishPaymentSuccess } = require("../kafka/producer");

async function pay(req, res) {
  try {
    const { bookingId, userId, amount, method } = req.body;

    const payment = await Payment.create({
      bookingId,
      userId,
      amount,
      method,
      status: "SUCCESS"
    });

    await publishPaymentSuccess(payment);

    res.json(payment);
  } catch (err) {
    console.error("PAYMENT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
}


module.exports = { pay };
