const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const RefreshToken = sequelize.define(
  "RefreshToken",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    token: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },

    isRevoked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "refresh_tokens",
    timestamps: true,
  }
);

module.exports = RefreshToken;