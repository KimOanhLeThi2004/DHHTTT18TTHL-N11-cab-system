const { Sequelize } = require("sequelize");
require('dotenv').config();
const sequelize = new Sequelize(process.env.POSTGRES_URL, {
  logging: false
});

module.exports = { sequelize };
