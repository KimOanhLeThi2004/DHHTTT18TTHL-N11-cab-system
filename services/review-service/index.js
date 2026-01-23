require('dotenv').config();
const express = require('express');
const cors = require('cors');
// Đường dẫn vẫn là ./config vì folder config nằm ngay cạnh index.js
const sequelize = require('./config/database'); 
const reviewRoutes = require('./routes/reviewRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/reviews', reviewRoutes);

// Kiểm tra kết nối DB
sequelize.authenticate()
  .then(() => {
    console.log('PostgreSQL connected.');
    return sequelize.sync({ force: false }); 
  })
  .then(() => {
    console.log('Database synced.');
  })
  .catch(err => {
    console.error('Unable to connect to PostgreSQL:', err);
  });

app.get('/health', (req, res) => res.status(200).send('Review Service (PG) OK'));

const PORT = process.env.PORT || 3006;
app.listen(PORT, () => console.log(`Review Service running on port ${PORT}`));