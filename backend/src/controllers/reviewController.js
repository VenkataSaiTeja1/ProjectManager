const { query } = require('../config/database');
const { asyncHandler, successResponse, paginatedResponse, AppError } = require('../utils/helpers');
const { logAudit } = require('../utils/audit');

const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, batch_id } = req.query;
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];
  let idx = 1;

  if (batch_id) { conditions.push(`wr.batch_id = $${idx++}`); params.push(batch_id); }

  // Faculty sees only reviews for batches that have their teams
  if (req.user.role === 'faculty') {
    conditions.push(`wr.batch_id IN (SELECT DISTINCT batch_id FROM teams WHERE guide_id = $${idx++})`);
    params.push(req.user.id);
  }

  // Student sees only their batch
  if (req.user.role === 'student') {
    conditions.push(`wr.batch_id = $${idx++}`);
    params.push(req.user.batch_id);
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const countRes = await query(`SELECT COUNT(*) FROM weekly_reviews wr ${where}`, params);
  const total = parseInt(countRes.rows[0].count);

  const { rows } = await query(
    `SELECT wr.*, b.name as batch_name, u.name as created_by_name,
            (SELECT COUNT(*) FROM review_acks WHERE review_id = wr.id) as seen_count,
            (SELECT COUNT(DISTINCT tm.user_id)
             FROM teams t JOIN team_members tm ON t.id = tm.team_id
             WHERE t.batch_id = wr.batch_id) as total_audience
     FROM weekly_reviews wr
     LEFT JOIN batches b ON wr.batch_id = b.id
     LEFT JOIN users u ON wr.created_by = u.id
     ${where}
     ORDER BY wr.review_date DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );

  return paginatedResponse(res, rows, total, page, limit);
});

const getById = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT wr.*, b.name as batch_name, u.name as created_by_name
     FROM weekly_reviews wr
     LEFT JOIN batches b ON wr.batch_id = b.id
     LEFT JOIN users u ON wr.created_by = u.id
     WHERE wr.id = $1`,
    [req.params.id]
  );
  if (rows.length === 0) throw new AppError('Review not found', 404);

  // Get acknowledgements
  const { rows: acks } = await query(
    `SELECT ra.*, u.name as user_name, u.email as user_email
     FROM review_acks ra JOIN users u ON ra.user_id = u.id
     WHERE ra.review_id = $1 ORDER BY ra.seen_at DESC`,
    [req.params.id]
  );

  // Get who hasn't seen
  const { rows: notSeen } = await query(
    `SELECT u.id, u.name, u.email FROM users u
     JOIN team_members tm ON u.id = tm.user_id
     JOIN teams t ON tm.team_id = t.id
     WHERE t.batch_id = $1
     AND u.id NOT IN (SELECT user_id FROM review_acks WHERE review_id = $2)`,
    [rows[0].batch_id, req.params.id]
  );

  // Get remarks
  const { rows: remarks } = await query(
    `SELECT rr.*, u.name as user_name, t.name as team_name
     FROM review_remarks rr
     JOIN users u ON rr.user_id = u.id
     JOIN teams t ON rr.team_id = t.id
     WHERE rr.review_id = $1 ORDER BY rr.created_at DESC`,
    [req.params.id]
  );

  return successResponse(res, { ...rows[0], acks, notSeen, remarks });
});

const create = asyncHandler(async (req, res) => {
  const { batch_id, week_no, review_date, suggestions, action_items, attachment_link } = req.body;

  const { rows } = await query(
    `INSERT INTO weekly_reviews (batch_id, week_no, review_date, suggestions, action_items, attachment_link, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [batch_id, week_no, review_date, suggestions || null, JSON.stringify(action_items || []), attachment_link || null, req.user.id]
  );

  // Create notifications for batch students
  const { rows: students } = await query(
    `SELECT DISTINCT tm.user_id FROM team_members tm
     JOIN teams t ON tm.team_id = t.id
     WHERE t.batch_id = $1`,
    [batch_id]
  );

  for (const student of students) {
    await query(
      `INSERT INTO notifications (user_id, type, title, message, entity, entity_id)
       VALUES ($1, 'review', 'New Weekly Review', $2, 'weekly_reviews', $3)`,
      [student.user_id, `Week ${week_no} review posted`, rows[0].id]
    );
  }

  await logAudit(req.user.id, 'create_review', 'weekly_reviews', rows[0].id, { batch_id, week_no });
  return successResponse(res, rows[0], 'Review created', 201);
});

const update = asyncHandler(async (req, res) => {
  const { suggestions, action_items, attachment_link } = req.body;
  const fields = [];
  const params = [];
  let idx = 1;

  if (suggestions !== undefined) { fields.push(`suggestions = $${idx++}`); params.push(suggestions); }
  if (action_items !== undefined) { fields.push(`action_items = $${idx++}`); params.push(JSON.stringify(action_items)); }
  if (attachment_link !== undefined) { fields.push(`attachment_link = $${idx++}`); params.push(attachment_link); }

  if (fields.length === 0) throw new AppError('No fields to update', 400);

  params.push(req.params.id);
  const { rows } = await query(
    `UPDATE weekly_reviews SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );
  if (rows.length === 0) throw new AppError('Review not found', 404);

  await logAudit(req.user.id, 'update_review', 'weekly_reviews', rows[0].id);
  return successResponse(res, rows[0], 'Review updated');
});

const remove = asyncHandler(async (req, res) => {
  const { rows } = await query('DELETE FROM weekly_reviews WHERE id = $1 RETURNING id', [req.params.id]);
  if (rows.length === 0) throw new AppError('Review not found', 404);
  await logAudit(req.user.id, 'delete_review', 'weekly_reviews', parseInt(req.params.id));
  return successResponse(res, null, 'Review deleted');
});

const acknowledge = asyncHandler(async (req, res) => {
  await query(
    'INSERT INTO review_acks (review_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [req.params.id, req.user.id]
  );
  return successResponse(res, null, 'Marked as seen');
});

const addRemark = asyncHandler(async (req, res) => {
  const { review_id, team_id, remark, status } = req.body;

  // Faculty must be guide of the team
  if (req.user.role === 'faculty') {
    const { rows } = await query('SELECT id FROM teams WHERE id = $1 AND guide_id = $2', [team_id, req.user.id]);
    if (rows.length === 0) throw new AppError('Access denied', 403);
  }

  const { rows } = await query(
    `INSERT INTO review_remarks (review_id, team_id, user_id, remark, status)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [review_id, team_id, req.user.id, remark, status || 'pending']
  );

  await logAudit(req.user.id, 'add_remark', 'review_remarks', rows[0].id);
  return successResponse(res, rows[0], 'Remark added', 201);
});

const updateRemark = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const { rows } = await query(
    'UPDATE review_remarks SET status = $1 WHERE id = $2 RETURNING *',
    [status, req.params.remarkId]
  );
  if (rows.length === 0) throw new AppError('Remark not found', 404);
  await logAudit(req.user.id, 'update_remark', 'review_remarks', rows[0].id);
  return successResponse(res, rows[0], 'Remark updated');
});

module.exports = { getAll, getById, create, update, remove, acknowledge, addRemark, updateRemark };
