const { query } = require('../config/database');
const { asyncHandler, successResponse, paginatedResponse, AppError } = require('../utils/helpers');

const getMyNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unread_only } = req.query;
  const offset = (page - 1) * limit;

  let filter = 'WHERE user_id = $1';
  const params = [req.user.id];
  let idx = 2;

  if (unread_only === 'true') {
    filter += ' AND is_read = FALSE';
  }

  const countRes = await query(`SELECT COUNT(*) FROM notifications ${filter}`, params);
  const total = parseInt(countRes.rows[0].count, 10);

  const { rows } = await query(
    `SELECT * FROM notifications
     ${filter}
     ORDER BY created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );

  const { rows: unreadRows } = await query(
    'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE',
    [req.user.id]
  );

  return successResponse(res, {
    notifications: rows,
    unreadCount: parseInt(unreadRows[0].count, 10),
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / limit),
    },
  });
});

const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rows } = await query(
    'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *',
    [id, req.user.id]
  );
  if (rows.length === 0) throw new AppError('Notification not found', 404);
  return successResponse(res, rows[0], 'Marked as read');
});

const markAllAsRead = asyncHandler(async (req, res) => {
  await query(
    'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
    [req.user.id]
  );
  return successResponse(res, null, 'All notifications marked as read');
});

module.exports = { getMyNotifications, markAsRead, markAllAsRead };
