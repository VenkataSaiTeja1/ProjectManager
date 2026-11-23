const { query } = require('../config/database');
const { asyncHandler, successResponse, paginatedResponse, AppError } = require('../utils/helpers');
const { logAudit } = require('../utils/audit');

const getAll = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM batches ORDER BY created_at DESC');
  return successResponse(res, rows);
});

const getById = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM batches WHERE id = $1', [req.params.id]);
  if (rows.length === 0) throw new AppError('Batch not found', 404);
  return successResponse(res, rows[0]);
});

const create = asyncHandler(async (req, res) => {
  const { name, academic_year } = req.body;
  const { rows } = await query(
    'INSERT INTO batches (name, academic_year) VALUES ($1, $2) RETURNING *',
    [name, academic_year]
  );
  await logAudit(req.user.id, 'create', 'batches', rows[0].id, { name, academic_year });
  return successResponse(res, rows[0], 'Batch created', 201);
});

const update = asyncHandler(async (req, res) => {
  const { name, academic_year } = req.body;
  const { rows } = await query(
    'UPDATE batches SET name = $1, academic_year = $2 WHERE id = $3 RETURNING *',
    [name, academic_year, req.params.id]
  );
  if (rows.length === 0) throw new AppError('Batch not found', 404);
  await logAudit(req.user.id, 'update', 'batches', rows[0].id, { name, academic_year });
  return successResponse(res, rows[0], 'Batch updated');
});

const remove = asyncHandler(async (req, res) => {
  const { rows } = await query('DELETE FROM batches WHERE id = $1 RETURNING id', [req.params.id]);
  if (rows.length === 0) throw new AppError('Batch not found', 404);
  await logAudit(req.user.id, 'delete', 'batches', parseInt(req.params.id));
  return successResponse(res, null, 'Batch deleted');
});

module.exports = { getAll, getById, create, update, remove };
