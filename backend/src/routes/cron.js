const express = require('express');
const { sendMissingUpdateReminders } = require('../services/emailService');
const { asyncHandler, successResponse, AppError } = require('../utils/helpers');

const router = express.Router();

router.post('/remind-missing', asyncHandler(async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers['x-cron-secret'] || req.headers.authorization;

  if (cronSecret && authHeader !== cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    throw new AppError('Unauthorized cron request', 401);
  }

  const result = await sendMissingUpdateReminders();
  return successResponse(res, result, 'Reminders process completed');
}));

module.exports = router;
