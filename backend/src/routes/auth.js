const express = require('express');
const rateLimit = require('express-rate-limit');
const { login, logout, me, changePassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate, loginSchema, changePasswordSchema } = require('../validators/schemas');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, message: 'Too many login attempts. Try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, validate(loginSchema), login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, me);
router.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);

module.exports = router;
