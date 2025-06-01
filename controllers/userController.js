const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendNotification } = require('../utils/email');
const { validationResult } = require('express-validator');

// Register new user
const register = async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        path: err.param,
        msg: err.msg
      }))
    });
  }

  const { name, email, phone, country, password } = req.body;
  
  try {
    // Check if user exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({
        message: 'Registration failed',
        errors: [{
          path: 'email',
          msg: 'Email already in use'
        }]
      });
    }

    // Create new user
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ name, email: email.toLowerCase(), phone, country, password: hashed });
    await user.save();

    // Send admin notification
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
    console.error(err.message);
    res.status(500).json({ 
      message: 'Server error during registration',
      error: err.message 
    });
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
    if (!user) {
      return res.status(401).json({ 
        message: 'Invalid credentials' 
      });
    }

    // Check password - handle both hashed and plaintext scenarios
    let match = false;
    
    // Check if password is stored as hash
    if (user.password.startsWith('$2a$')) {
      match = await bcrypt.compare(password, user.password);
    } 
    // Handle legacy plaintext passwords
    else {
      match = (password === user.password);
      
      // If matched with plaintext, upgrade to hashed
      if (match) {
        const hashed = await bcrypt.hash(password, 10);
        user.password = hashed;
        await user.save();
      }
    }

    if (!match) {
      return res.status(401).json({ 
        message: 'Invalid credentials' 
      });
    }

    // Send admin notification
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
    
    // Regular user response
    res.json({ 
      token, 
      status: user.status,
      isAdmin: false
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ 
      message: 'Server error during login',
      error: err.message 
    });
  }
};

// Verify 5-digit PIN
const verifyPin = async (req, res) => {
  const { pin } = req.body;
  
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.pin === pin) {
      user.status = 'step2';
      if (!user.approvedSteps.includes('pin')) user.approvedSteps.push('pin');
      await user.save();

      // Send admin notification
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
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      message: 'Server error during PIN verification',
      error: err.message 
    });
  }
};

// Select registration plan
const selectPlan = async (req, res) => {
  const { plan } = req.body;
  
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.status !== 'step2') {
      return res.status(403).json({ message: 'Not authorized or PIN not verified' });
    }

    user.plan = plan;
    await user.save();

    // Send admin notification
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
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      message: 'Server error during plan selection',
      error: err.message 
    });
  }
};

// Complete ID card step
const completeIDCard = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.status !== 'step3') {
      return res.status(403).json({ message: 'Not authorized or plan not approved' });
    }

    await user.save();

    // Send admin notification
    await sendNotification(
      process.env.ADMIN_EMAIL,
      '🆔 ID Card Request',
      `User submitted ID card receipt:\n
       ID: ${user._id}
       Email: ${user.email}
    `
    );

    res.json({ message: 'ID card request sent. Await admin approval.', status: user.status });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      message: 'Server error during ID card submission',
      error: err.message 
    });
  }
};

// Get current user profile & status
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ 
      message: 'Server error fetching profile',
      error: err.message 
    });
  }
};

module.exports = {
  register,
  login,
  verifyPin,
  selectPlan,
  completeIDCard,
  getUserProfile
};