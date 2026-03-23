const { DataTypes } = require("sequelize");
const { sequelize } = require("../db/postgres");

const Payment = sequelize.define("Payment", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },

  bookingId: {
    type: DataTypes.STRING,
    allowNull: false
  },

  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },

  driverId: {
    type: DataTypes.UUID,
    allowNull: false
  },

  amount: {
    type: DataTypes.FLOAT,
    allowNull: false
  },

  method: {
    type: DataTypes.STRING // CASH, WALLET, CARD
  },

  status: {
    type: DataTypes.STRING, // PENDING, SUCCESS, FAILED
    defaultValue: "PENDING"
  }
});

module.exports = { Payment };
