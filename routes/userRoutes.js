const express = require('express');
const router = express.Router();
const {
  register,
  login,
  verifyPin,
  selectPlan,
  completeIDCard,
  getUserProfile
} = require('../controllers/userController');
const auth = require('../middlewares/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/verify-pin', auth, verifyPin);
router.post('/select-plan', auth, selectPlan);
router.post('/complete-idcard', auth, completeIDCard);
router.get('/profile', auth, getUserProfile);

module.exports = router;
