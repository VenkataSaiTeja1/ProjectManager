const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { generateToken } = require('../middleware/auth');
const { AppError, asyncHandler, successResponse } = require('../utils/helpers');
const { logAudit } = require('../utils/audit');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

const login = asyncHandler(async (req, res) => {
  const { identifier, email, password } = req.body;
  const loginId = (identifier || email || '').trim().toLowerCase();

  const { rows } = await query(
    `SELECT id, name, email, phone, role, password_hash, must_change_password, batch_id, is_active, roll_number
     FROM users
     WHERE LOWER(TRIM(roll_number)) = $1 OR (email IS NOT NULL AND LOWER(TRIM(email)) = $1)`,
    [loginId]
  );

  if (rows.length === 0) {
    throw new AppError('Invalid Roll Number / User ID or password.', 401);
  }

  const user = rows[0];

  if (!user.is_active) {
    throw new AppError('Your account has been deactivated. Contact the coordinator.', 403);
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new AppError('Invalid Roll Number / User ID or password.', 401);
  }

  const token = generateToken(user);

  await logAudit(user.id, 'login', 'users', user.id, { ip: req.ip });

  res.cookie('token', token, COOKIE_OPTIONS);

  const { password_hash, ...userData } = user;

  return successResponse(res, {
    user: userData,
    mustChangePassword: user.must_change_password,
  }, 'Login successful');
});

const logout = asyncHandler(async (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  });

  if (req.user) {
    await logAudit(req.user.id, 'logout', 'users', req.user.id);
  }

  return successResponse(res, null, 'Logged out successfully');
});

const me = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.phone, u.role, u.must_change_password, u.batch_id, u.is_active, u.roll_number,
            b.name as batch_name,
            (SELECT COUNT(*) FROM notifications WHERE user_id = u.id AND is_read = FALSE) as unread_count
     FROM users u
     LEFT JOIN batches b ON u.batch_id = b.id
     WHERE u.id = $1`,
    [req.user.id]
  );

  // Get team info for students
  let teamInfo = null;
  if (req.user.role === 'student') {
    const { rows: teams } = await query(
      `SELECT t.id, t.name, t.project_title, t.lead_id,
              (SELECT name FROM users WHERE id = t.lead_id) as lead_name,
              (SELECT roll_number FROM users WHERE id = t.lead_id) as lead_roll_number,
              (SELECT name FROM users WHERE id = t.guide_id) as guide_name
       FROM teams t
       JOIN team_members tm ON t.id = tm.team_id
       WHERE tm.user_id = $1
       LIMIT 1`,
      [req.user.id]
    );
    if (teams.length > 0) teamInfo = teams[0];
  }

  return successResponse(res, {
    user: rows[0],
    team: teamInfo,
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const { rows } = await query(
    'SELECT id, password_hash FROM users WHERE id = $1',
    [req.user.id]
  );

  const isMatch = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!isMatch) {
    throw new AppError('Current password is incorrect.', 400);
  }

  const hash = await bcrypt.hash(newPassword, 12);

  await query(
    'UPDATE users SET password_hash = $1, must_change_password = FALSE WHERE id = $2',
    [hash, req.user.id]
  );

  await logAudit(req.user.id, 'change_password', 'users', req.user.id);

  return successResponse(res, null, 'Password changed successfully');
});

module.exports = { login, logout, me, changePassword };
