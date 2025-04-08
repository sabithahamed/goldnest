const express = require('express');
const {
    registerUser,
    verifyEmail, // Import
    loginUser,
    forgotPassword,
    resetPassword,
    resendVerificationOtp // Import
} = require('../controllers/authController');

const router = express.Router();

router.post('/register', registerUser);
router.post('/verify-email', verifyEmail); // Add verify route
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resettoken', resetPassword);
router.post('/resend-verification', resendVerificationOtp); // Add resend route

module.exports = router;