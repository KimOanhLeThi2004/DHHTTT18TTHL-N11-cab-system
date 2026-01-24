const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String,
  role: {
    type: String,
    enum: ['USER', 'DRIVER', 'ADMIN'],
    default: 'USER'
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
