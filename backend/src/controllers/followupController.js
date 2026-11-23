const { query } = require('../config/database');
const { asyncHandler, successResponse, paginatedResponse, AppError } = require('../utils/helpers');
const { logAudit } = require('../utils/audit');

const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, team_id, search } = req.query;
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];
  let idx = 1;

  if (team_id) { conditions.push(`f.team_id = $${idx++}`); params.push(team_id); }
  if (search) {
    conditions.push(`(f.note ILIKE $${idx} OR t.name ILIKE $${idx})`);
    params.push(`%${search}%`);
    idx++;
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const countRes = await query(`SELECT COUNT(*) FROM followups f JOIN teams t ON f.team_id = t.id ${where}`, params);
  const total = parseInt(countRes.rows[0].count);

  const { rows } = await query(
    `SELECT f.*, t.name as team_name, u.name as created_by_name
     FROM followups f
     JOIN teams t ON f.team_id = t.id
     JOIN users u ON f.created_by = u.id
     ${where}
     ORDER BY f.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );

  return paginatedResponse(res, rows, total, page, limit);
});

const create = asyncHandler(async (req, res) => {
  const { team_id, note, called_on } = req.body;

  const { rows } = await query(
    `INSERT INTO followups (team_id, note, called_on, created_by)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [team_id, note, called_on || new Date(), req.user.id]
  );

  await logAudit(req.user.id, 'create_followup', 'followups', rows[0].id, { team_id });
  return successResponse(res, rows[0], 'Follow-up logged', 201);
});

const remove = asyncHandler(async (req, res) => {
  const { rows } = await query('DELETE FROM followups WHERE id = $1 RETURNING id', [req.params.id]);
  if (rows.length === 0) throw new AppError('Follow-up not found', 404);
  await logAudit(req.user.id, 'delete_followup', 'followups', parseInt(req.params.id));
  return successResponse(res, null, 'Follow-up deleted');
});

module.exports = { getAll, create, remove };
