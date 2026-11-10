const express = require('express');
const { register, verifyOtp, resendOtp, login, getMe, logout } = require('../controllers/auth');

const router = express.Router();

const { protect } = require('../middleware/auth')

router.post('/register', register);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/login', login);
router.get('/me', protect, getMe);
router.get('/logout', logout);
module.exports = router;