const { DataTypes } = require("sequelize");
const { sequelize } = require("../db/postgres");

const Driver = sequelize.define("Driver", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },

  name: {
    type: DataTypes.STRING,
    allowNull: false
  },

  phone: {
    type: DataTypes.STRING,
    unique: true
  },

  vehicleType: {
    type: DataTypes.STRING
  },

  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

module.exports = { Driver };
