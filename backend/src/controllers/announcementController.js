const { query } = require('../config/database');
const { asyncHandler, successResponse, paginatedResponse, AppError } = require('../utils/helpers');
const { logAudit } = require('../utils/audit');

const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];
  let idx = 1;

  // Filter based on audience and role
  if (req.user.role === 'student') {
    conditions.push(`(
      a.audience_type = 'all'
      OR (a.audience_type = 'batch' AND a.batch_id = $${idx++})
      OR (a.audience_type = 'team' AND a.team_id IN (SELECT team_id FROM team_members WHERE user_id = $${idx++}))
    )`);
    params.push(req.user.batch_id, req.user.id);
  } else if (req.user.role === 'faculty') {
    conditions.push(`(
      a.audience_type = 'all'
      OR (a.audience_type = 'batch' AND a.batch_id IN (SELECT DISTINCT batch_id FROM teams WHERE guide_id = $${idx++}))
      OR (a.audience_type = 'team' AND a.team_id IN (SELECT id FROM teams WHERE guide_id = $${idx++}))
    )`);
    params.push(req.user.id, req.user.id);
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const countRes = await query(`SELECT COUNT(*) FROM announcements a ${where}`, params);
  const total = parseInt(countRes.rows[0].count);

  const { rows } = await query(
    `SELECT a.*, u.name as created_by_name,
            b.name as batch_name, t.name as team_name
     FROM announcements a
     LEFT JOIN users u ON a.created_by = u.id
     LEFT JOIN batches b ON a.batch_id = b.id
     LEFT JOIN teams t ON a.team_id = t.id
     ${where}
     ORDER BY a.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );

  return paginatedResponse(res, rows, total, page, limit);
});

const create = asyncHandler(async (req, res) => {
  const { audience_type, batch_id, team_id, title, message } = req.body;

  if (audience_type === 'batch' && !batch_id) throw new AppError('batch_id required for batch audience', 400);
  if (audience_type === 'team' && !team_id) throw new AppError('team_id required for team audience', 400);

  const { rows } = await query(
    `INSERT INTO announcements (audience_type, batch_id, team_id, title, message, created_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [audience_type, batch_id || null, team_id || null, title, message, req.user.id]
  );

  // Create notifications
  let notifyUsers = [];
  if (audience_type === 'all') {
    const { rows: users } = await query('SELECT id FROM users WHERE role != $1 AND is_active = TRUE', ['admin']);
    notifyUsers = users;
  } else if (audience_type === 'batch') {
    const { rows: users } = await query(
      `SELECT DISTINCT tm.user_id as id FROM team_members tm
       JOIN teams t ON tm.team_id = t.id WHERE t.batch_id = $1`, [batch_id]
    );
    notifyUsers = users;
  } else if (audience_type === 'team') {
    const { rows: users } = await query(
      'SELECT user_id as id FROM team_members WHERE team_id = $1', [team_id]
    );
    notifyUsers = users;
  }

  for (const u of notifyUsers) {
    await query(
      `INSERT INTO notifications (user_id, type, title, message, entity, entity_id)
       VALUES ($1, 'announcement', $2, $3, 'announcements', $4)`,
      [u.id, title, message.substring(0, 200), rows[0].id]
    );
  }

  await logAudit(req.user.id, 'create_announcement', 'announcements', rows[0].id, { audience_type, title });
  return successResponse(res, rows[0], 'Announcement posted', 201);
});

const remove = asyncHandler(async (req, res) => {
  const { rows } = await query('DELETE FROM announcements WHERE id = $1 RETURNING id', [req.params.id]);
  if (rows.length === 0) throw new AppError('Announcement not found', 404);
  await logAudit(req.user.id, 'delete_announcement', 'announcements', parseInt(req.params.id));
  return successResponse(res, null, 'Announcement deleted');
});

module.exports = { getAll, create, remove };
