const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const {
  register,
  login,
  verifyPin,
  selectPlan,
  completeIDCard,
  getUserProfile
} = require('../controllers/userController');
const auth = require('../middlewares/auth');

// Register route with phone number validation removed
router.post('/register', [
  check('name').notEmpty().withMessage('Name is required'),
  check('email').isEmail().withMessage('Invalid email format'),
  check('phone').notEmpty().withMessage('Phone number is required'),
  check('country').notEmpty().withMessage('Country is required'),
  check('password').notEmpty().withMessage('Password is required')
], register);

router.post('/login', login);
router.post('/verify-pin', auth, verifyPin);
router.post('/select-plan', auth, selectPlan);
router.post('/complete-idcard', auth, completeIDCard);
router.get('/profile', auth, getUserProfile);

module.exports = router;