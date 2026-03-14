const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/register', authController.validateRegister, authController.register);
router.post('/login', authController.validateLogin, authController.login);

module.exports = router;
