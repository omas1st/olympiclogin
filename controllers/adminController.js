const User = require('../models/User');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

// Admin login
const adminLogin = (req, res) => {
  const { email, password } = req.body;
  if (
    email === process.env.ADMIN_USER &&
    password === process.env.ADMIN_PASS
  ) {
    const token = jwt.sign({ role: 'admin' }, process.env.secret_key);
    return res.json({ token });
  }
  res.status(401).json({ message: 'Invalid admin credentials' });
};

// List all users
const listUsers = async (req, res) => {
  const users = await User.find();
  res.json(users);
};

// Search user by email
const searchUser = async (req, res) => {
  const { email } = req.query;
  const users = await User.find({ email: email.toLowerCase() });
  res.json(users);
};

// Approve a specific step (pin, plan, idcard)
const approveStep = async (req, res) => {
  const { userId, step } = req.body;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  switch (step) {
    case 'pin':
      user.status = 'step2';
      break;
    case 'plan':
      user.status = 'step3';
      break;
    case 'idcard':
      user.status = 'completed';
      break;
  }
  if (!user.approvedSteps.includes(step)) user.approvedSteps.push(step);
  await user.save();

  res.json({ message: `Approved ${step}`, status: user.status });
};

// Set 5-digit PIN for a user
const setPin = async (req, res) => {
  const { userId, pin } = req.body;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  user.pin = pin;
  await user.save();
  res.json({ message: 'PIN set' });
};

module.exports = { adminLogin, listUsers, searchUser, approveStep, setPin };
