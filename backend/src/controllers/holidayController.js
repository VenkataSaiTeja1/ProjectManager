const { query } = require('../config/database');
const { asyncHandler, successResponse, AppError } = require('../utils/helpers');
const { logAudit } = require('../utils/audit');

const getAll = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM holidays ORDER BY holiday_date DESC');
  return successResponse(res, rows);
});

const create = asyncHandler(async (req, res) => {
  const { holiday_date, reason } = req.body;
  const { rows } = await query(
    'INSERT INTO holidays (holiday_date, reason) VALUES ($1, $2) RETURNING *',
    [holiday_date, reason]
  );
  await logAudit(req.user.id, 'create_holiday', 'holidays', rows[0].id, { holiday_date, reason });
  return successResponse(res, rows[0], 'Holiday added', 201);
});

const remove = asyncHandler(async (req, res) => {
  const { rows } = await query('DELETE FROM holidays WHERE id = $1 RETURNING id', [req.params.id]);
  if (rows.length === 0) throw new AppError('Holiday not found', 404);
  await logAudit(req.user.id, 'delete_holiday', 'holidays', parseInt(req.params.id));
  return successResponse(res, null, 'Holiday removed');
});

module.exports = { getAll, create, remove };
