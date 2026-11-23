const { query } = require('../config/database');
const { asyncHandler, successResponse, paginatedResponse, AppError } = require('../utils/helpers');
const { logAudit } = require('../utils/audit');

const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, batch_id, team_id } = req.query;
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];
  let idx = 1;

  if (status) { conditions.push(`p.status = $${idx++}`); params.push(status); }
  if (team_id) { conditions.push(`p.team_id = $${idx++}`); params.push(team_id); }
  if (batch_id) { conditions.push(`t.batch_id = $${idx++}`); params.push(batch_id); }

  if (req.user.role === 'faculty') {
    conditions.push(`t.guide_id = $${idx++}`);
    params.push(req.user.id);
  }
  if (req.user.role === 'student') {
    conditions.push(`p.team_id IN (SELECT team_id FROM team_members WHERE user_id = $${idx++})`);
    params.push(req.user.id);
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const countRes = await query(`SELECT COUNT(*) FROM papers p JOIN teams t ON p.team_id = t.id ${where}`, params);
  const total = parseInt(countRes.rows[0].count);

  const { rows } = await query(
    `SELECT p.*, t.name as team_name, t.project_title, b.name as batch_name
     FROM papers p
     JOIN teams t ON p.team_id = t.id
     LEFT JOIN batches b ON t.batch_id = b.id
     ${where}
     ORDER BY p.updated_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );

  return paginatedResponse(res, rows, total, page, limit);
});

const getById = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT p.*, t.name as team_name, t.project_title
     FROM papers p JOIN teams t ON p.team_id = t.id
     WHERE p.id = $1`,
    [req.params.id]
  );
  if (rows.length === 0) throw new AppError('Paper not found', 404);
  return successResponse(res, rows[0]);
});

const create = asyncHandler(async (req, res) => {
  const { team_id, title, venue_or_journal, submission_id, status, status_date, plagiarism_percent, notes } = req.body;

  const { rows } = await query(
    `INSERT INTO papers (team_id, title, venue_or_journal, submission_id, status, status_date, plagiarism_percent, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [team_id, title, venue_or_journal || null, submission_id || null, status || 'not_started',
     status_date || null, plagiarism_percent || null, notes || null]
  );

  await logAudit(req.user.id, 'create_paper', 'papers', rows[0].id, { team_id, title });
  return successResponse(res, rows[0], 'Paper created', 201);
});

const update = asyncHandler(async (req, res) => {
  const { title, venue_or_journal, submission_id, status, status_date, plagiarism_percent, notes } = req.body;
  const fields = [];
  const params = [];
  let idx = 1;

  if (title !== undefined) { fields.push(`title = $${idx++}`); params.push(title); }
  if (venue_or_journal !== undefined) { fields.push(`venue_or_journal = $${idx++}`); params.push(venue_or_journal); }
  if (submission_id !== undefined) { fields.push(`submission_id = $${idx++}`); params.push(submission_id); }
  if (status !== undefined) { fields.push(`status = $${idx++}`); params.push(status); }
  if (status_date !== undefined) { fields.push(`status_date = $${idx++}`); params.push(status_date); }
  if (plagiarism_percent !== undefined) { fields.push(`plagiarism_percent = $${idx++}`); params.push(plagiarism_percent); }
  if (notes !== undefined) { fields.push(`notes = $${idx++}`); params.push(notes); }

  fields.push(`updated_at = NOW()`);

  params.push(req.params.id);
  const { rows } = await query(
    `UPDATE papers SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );
  if (rows.length === 0) throw new AppError('Paper not found', 404);

  await logAudit(req.user.id, 'update_paper', 'papers', rows[0].id, req.body);
  return successResponse(res, rows[0], 'Paper updated');
});

const remove = asyncHandler(async (req, res) => {
  const { rows } = await query('DELETE FROM papers WHERE id = $1 RETURNING id', [req.params.id]);
  if (rows.length === 0) throw new AppError('Paper not found', 404);
  await logAudit(req.user.id, 'delete_paper', 'papers', parseInt(req.params.id));
  return successResponse(res, null, 'Paper deleted');
});

module.exports = { getAll, getById, create, update, remove };
