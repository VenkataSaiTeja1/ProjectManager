const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { AppError } = require('../utils/helpers');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRY = '7d';

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
};

const authenticate = async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      throw new AppError('Authentication required. Please log in.', 401);
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const { rows } = await query(
      'SELECT id, name, email, phone, role, must_change_password, batch_id, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (rows.length === 0 || !rows[0].is_active) {
      throw new AppError('User not found or deactivated.', 401);
    }

    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new AppError('Invalid or expired token. Please log in again.', 401));
    }
    next(err);
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }
    next();
  };
};

const requirePasswordChange = (req, res, next) => {
  if (req.user.must_change_password && req.path !== '/api/auth/change-password' && req.path !== '/api/auth/me') {
    return res.status(403).json({
      success: false,
      message: 'You must change your password before continuing.',
      mustChangePassword: true,
    });
  }
  next();
};

module.exports = { generateToken, authenticate, authorize, requirePasswordChange, JWT_SECRET };
