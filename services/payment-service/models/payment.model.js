const { DataTypes, Op } = require("sequelize");
const { sequelize } = require("../db/postgres");

const Payment = sequelize.define("Payment", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },

  bookingId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },

  userId: {
    type: DataTypes.STRING,
    allowNull: false
  },

  driverId: {
    type: DataTypes.STRING,
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
  },

  idempotencyKey: {
    type: DataTypes.STRING,
    allowNull: true
  },

  cardNumberEncrypted: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  cardLast4: {
    type: DataTypes.STRING(4),
    allowNull: true
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ["bookingId", "idempotencyKey"],
      where: { idempotencyKey: { [Op.ne]: null } }
    }
  ]
});

module.exports = { Payment };
