require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('DB connected'));

app.listen(3001, () => {
  console.log('Auth Service running on port 3001');
});
