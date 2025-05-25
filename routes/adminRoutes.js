const express = require('express');
const router = express.Router();
const {
  adminLogin,
  listUsers,
  searchUser,
  approveStep,
  setPin
} = require('../controllers/adminController');
const adminAuth = require('../middlewares/adminAuth');

router.post('/login', adminLogin);
router.get('/users', adminAuth, listUsers);
router.get('/search', adminAuth, searchUser);
router.post('/approve', adminAuth, approveStep);
router.post('/set-pin', adminAuth, setPin);

module.exports = router;