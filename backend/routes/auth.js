const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/register', authController.validateRegister, authController.register);
router.post('/login', authController.validateLogin, authController.login);
router.post('/forgot-password', authController.validateForgotPassword, authController.forgotPassword);
router.post('/reset-password', authController.validateResetPassword, authController.resetPassword);
router.post(
  '/reset-password-otp',
  authController.validateResetPasswordOtp,
  authController.resetPasswordWithOtp
);

module.exports = router;
