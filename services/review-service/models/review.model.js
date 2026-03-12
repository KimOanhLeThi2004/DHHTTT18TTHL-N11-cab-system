const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Review = sequelize.define("Review", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },

  rideId: {
    type: DataTypes.STRING,
    allowNull: false
  },

  bookingId: {
    type: DataTypes.STRING,
    allowNull: false
  },

  reviewerId: {
    type: DataTypes.UUID,
    allowNull: false
  },

  driverId: {
    type: DataTypes.UUID,
    allowNull: false
  },

  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },

  comment: {
    type: DataTypes.TEXT
  }
});

module.exports = Review;
