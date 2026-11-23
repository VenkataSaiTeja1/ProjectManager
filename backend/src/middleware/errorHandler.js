const { AppError } = require('../utils/helpers');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors || null;

  // Zod validation errors
  if (err.name === 'ZodError') {
    statusCode = 400;
    message = 'Validation error';
    errors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  }

  // PostgreSQL unique violation
  if (err.code === '23505') {
    statusCode = 409;
    message = 'A record with this value already exists.';
    const match = err.detail?.match(/\((.+?)\)=\((.+?)\)/);
    if (match) {
      message = `Duplicate value for ${match[1]}: ${match[2]}`;
    }
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    statusCode = 400;
    message = 'Referenced record does not exist.';
  }

  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', {
      statusCode,
      message,
      stack: err.stack,
      errors,
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = { errorHandler };
