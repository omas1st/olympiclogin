const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true },
  phone: String,
  country: String,
  password: String,
  pin: String,
  status: { type: String, default: 'step1' },
  plan: String,
  approvedSteps: [String]
});

module.exports = mongoose.model('User', userSchema);
