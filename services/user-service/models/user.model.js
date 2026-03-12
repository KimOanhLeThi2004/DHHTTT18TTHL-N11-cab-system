const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true   // ID nhận từ Auth Service
    },

    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },


    name: {
      type: DataTypes.STRING,
    },

    phone: {
      type: DataTypes.STRING,
    },

    avatar: {
      type: DataTypes.STRING,
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: 'users',
    timestamps: true,
  }
);

module.exports = User;
