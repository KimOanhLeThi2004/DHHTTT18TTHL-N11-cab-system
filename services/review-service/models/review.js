const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Review = sequelize.define('Review', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  booking_id: {
    type: DataTypes.STRING,
    allowNull: false,
    // Trong microservice, booking_id là tham chiếu lỏng từ Booking Service
  },
  reviewer_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  reviewee_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('CUSTOMER', 'DRIVER'),
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
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'reviews',
  timestamps: true, // Tự động tạo created_at, updated_at
  underscored: true // Sử dụng snake_case cho tên cột (created_at thay vì createdAt)
});

module.exports = Review;