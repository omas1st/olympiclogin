// controllers/userController.js

const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendNotification } = require('../utils/email');

// Register new user
const register = async (req, res) => {
  const { name, email, phone, country, password } = req.body;
  try {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: 'Email already in use' });

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ name, email: email.toLowerCase(), phone, country, password: hashed });
    await user.save();

    // send admin notification
    await sendNotification(
      process.env.ADMIN_EMAIL,
      '📥 New User Registration',
      `A new user has registered:\n
       Name: ${name}
       Email: ${email.toLowerCase()}
       Phone: ${phone}
       Country: ${country}
    `
    );

    const token = jwt.sign({ id: user._id, status: user.status }, process.env.secret_key);
    res.json({ token, status: user.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// User login
const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    // Check admin credentials first
    if (email === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
      const token = jwt.sign({ role: 'admin' }, process.env.secret_key);
      return res.json({ token, isAdmin: true });
    }

    // Regular user login
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    // send admin notification
    await sendNotification(
      process.env.ADMIN_EMAIL,
      '🔑 User Login',
      `User logged in:\n
       ID: ${user._id}
       Email: ${user.email}
       Status: ${user.status}
    `
    );

    const token = jwt.sign({ id: user._id, status: user.status }, process.env.secret_key);
    res.json({ token, status: user.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Verify 5-digit PIN
const verifyPin = async (req, res) => {
  const { pin } = req.body;
  const user = await User.findById(req.user.id);
  if (user.pin === pin) {
    user.status = 'step2';
    if (!user.approvedSteps.includes('pin')) user.approvedSteps.push('pin');
    await user.save();

    // send admin notification
    await sendNotification(
      process.env.ADMIN_EMAIL,
      '✅ PIN Verified',
      `User verified PIN:\n
       ID: ${user._id}
       Email: ${user.email}
    `
    );

    return res.json({ message: 'PIN verified', status: user.status });
  }
  return res.status(400).json({ message: 'Invalid PIN. Contact admin.' });
};

// Select registration plan (request only; status stays at step2 until admin approval)
const selectPlan = async (req, res) => {
  const { plan } = req.body;
  const user = await User.findById(req.user.id);
  if (user.status !== 'step2') {
    return res.status(403).json({ message: 'Not authorized or PIN not verified' });
  }

  user.plan = plan;
  await user.save();

  // send admin notification
  await sendNotification(
    process.env.ADMIN_EMAIL,
    '📋 Plan Selection Request',
    `User requested plan:\n
     ID: ${user._id}
     Email: ${user.email}
     Plan: ${plan}
  `
  );

  res.json({ message: 'Plan request sent. Await admin approval.', status: user.status });
};

// Complete ID card step (request only; status stays at step3 until admin approval)
const completeIDCard = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (user.status !== 'step3') {
    return res.status(403).json({ message: 'Not authorized or plan not approved' });
  }

  await user.save();

  // send admin notification
  await sendNotification(
    process.env.ADMIN_EMAIL,
    '🆔 ID Card Request',
    `User submitted ID card receipt:\n
     ID: ${user._id}
     Email: ${user.email}
  `
  );

  res.json({ message: 'ID card request sent. Await admin approval.', status: user.status });
};

// Get current user profile & status
const getUserProfile = async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json({ user });
};

module.exports = {
  register,
  login,
  verifyPin,
  selectPlan,
  completeIDCard,
  getUserProfile
};
