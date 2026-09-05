const express = require('express');
const authController = require('../controllers/authController');
const { authRateLimit } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/register', authRateLimit, authController.validateRegister, authController.register);
router.post('/login', authRateLimit, authController.validateLogin, authController.login);
router.post('/forgot-password', authRateLimit, authController.validateForgotPassword, authController.forgotPassword);
router.post('/reset-password', authRateLimit, authController.validateResetPassword, authController.resetPassword);
router.post(
  '/reset-password-otp',
  authRateLimit,
  authController.validateResetPasswordOtp,
  authController.resetPasswordWithOtp
);

module.exports = router;
