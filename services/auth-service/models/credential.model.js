const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Credential = sequelize.define(
  'Credential',
  {
  id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },

    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    role: {
      type: DataTypes.ENUM('CUSTOMER', 'DRIVER', 'ADMIN'),
      defaultValue: 'CUSTOMER',
    },

    userId: {
      type: DataTypes.UUID, // trỏ sang User hoặc Driver service
      allowNull: false,
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    },
  {
    tableName: 'credentials',
    timestamps: true,
  }
);

module.exports = Credential;
