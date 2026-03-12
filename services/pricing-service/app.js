const express = require('express');
const pricingRoutes = require('./routes/pricing.routes');
const verifyToken = require('./middlewares/verifyServiceToken');

const app = express();
app.use(express.json());

app.use('/pricing', verifyToken,pricingRoutes);

app.listen(3003, () => {
  console.log('Pricing Service running on port 3003');
});
