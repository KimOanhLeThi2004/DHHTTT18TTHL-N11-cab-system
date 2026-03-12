const express = require('express');
const { sequelize } = require('./models');
const authRoutes = require('./routes/auth.route');
require('dotenv').config();

const app = express();
app.use(express.json());

app.use('/auth', authRoutes);

sequelize
  .sync({ alter: true })
  .then(() => {
    console.log('Auth DB connected');
    app.listen(process.env.PORT, () => {
      console.log(`Auth Service running on port ${process.env.PORT}`);
    });
  })
  .catch((err) => console.error(err));
