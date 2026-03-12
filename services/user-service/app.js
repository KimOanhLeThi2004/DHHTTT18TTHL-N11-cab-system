const express = require('express');
const { sequelize } = require('./models');
const userRoutes = require('./routes/user.route');
// const midldeware = require('./midlewares/auth.middleware')
require('dotenv').config();

const app = express();
app.use(express.json());

app.use('/users' ,userRoutes);

sequelize
  .sync({alter: true})
  .then(() => {
    console.log('User DB connected');
    app.listen(process.env.PORT, () => {
      console.log(`User Service running on port ${process.env.PORT}`);
    });
  })
  .catch((err) => console.error(err));
