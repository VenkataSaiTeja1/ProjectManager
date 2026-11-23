const bcrypt = require('bcryptjs');
const { query, transaction } = require('../config/database');
const { asyncHandler, successResponse, paginatedResponse, AppError } = require('../utils/helpers');
const { logAudit } = require('../utils/audit');
const XLSX = require('xlsx');

const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, role, batch_id, search, is_active } = req.query;
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];
  let idx = 1;

  if (role) { conditions.push(`u.role = $${idx++}`); params.push(role); }
  if (batch_id) { conditions.push(`u.batch_id = $${idx++}`); params.push(batch_id); }
  if (is_active !== undefined) { conditions.push(`u.is_active = $${idx++}`); params.push(is_active === 'true'); }
  if (search) {
    conditions.push(`(u.name ILIKE $${idx} OR u.email ILIKE $${idx})`);
    params.push(`%${search}%`);
    idx++;
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const countRes = await query(`SELECT COUNT(*) FROM users u ${where}`, params);
  const total = parseInt(countRes.rows[0].count);

  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.phone, u.role, u.must_change_password, u.batch_id, u.is_active, u.created_at,
            b.name as batch_name
     FROM users u
     LEFT JOIN batches b ON u.batch_id = b.id
     ${where}
     ORDER BY u.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );

  return paginatedResponse(res, rows, total, page, limit);
});

const getById = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.phone, u.role, u.must_change_password, u.batch_id, u.is_active, u.created_at,
            b.name as batch_name
     FROM users u LEFT JOIN batches b ON u.batch_id = b.id
     WHERE u.id = $1`,
    [req.params.id]
  );
  if (rows.length === 0) throw new AppError('User not found', 404);
  return successResponse(res, rows[0]);
});

const create = asyncHandler(async (req, res) => {
  const { name, email, phone, role, password, batch_id } = req.body;
  const tempPassword = password || 'Temp@' + Math.random().toString(36).slice(2, 8);
  const hash = await bcrypt.hash(tempPassword, 12);

  const { rows } = await query(
    `INSERT INTO users (name, email, phone, role, password_hash, must_change_password, batch_id, is_active)
     VALUES ($1, $2, $3, $4, $5, TRUE, $6, TRUE) RETURNING id, name, email, phone, role, batch_id, is_active, created_at`,
    [name, email.toLowerCase().trim(), phone || null, role, hash, batch_id || null]
  );

  await logAudit(req.user.id, 'create_user', 'users', rows[0].id, { name, email, role });
  return successResponse(res, { ...rows[0], tempPassword }, 'User created', 201);
});

const update = asyncHandler(async (req, res) => {
  const { name, email, phone, role, batch_id, is_active } = req.body;
  const { rows: existing } = await query('SELECT id FROM users WHERE id = $1', [req.params.id]);
  if (existing.length === 0) throw new AppError('User not found', 404);

  const fields = [];
  const params = [];
  let idx = 1;

  if (name !== undefined) { fields.push(`name = $${idx++}`); params.push(name); }
  if (email !== undefined) { fields.push(`email = $${idx++}`); params.push(email.toLowerCase().trim()); }
  if (phone !== undefined) { fields.push(`phone = $${idx++}`); params.push(phone); }
  if (role !== undefined) { fields.push(`role = $${idx++}`); params.push(role); }
  if (batch_id !== undefined) { fields.push(`batch_id = $${idx++}`); params.push(batch_id); }
  if (is_active !== undefined) { fields.push(`is_active = $${idx++}`); params.push(is_active); }

  if (fields.length === 0) throw new AppError('No fields to update', 400);

  params.push(req.params.id);
  const { rows } = await query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, name, email, phone, role, batch_id, is_active`,
    params
  );

  await logAudit(req.user.id, 'update_user', 'users', rows[0].id, req.body);
  return successResponse(res, rows[0], 'User updated');
});

const resetPassword = asyncHandler(async (req, res) => {
  const tempPassword = 'Temp@' + Math.random().toString(36).slice(2, 8);
  const hash = await bcrypt.hash(tempPassword, 12);

  const { rows } = await query(
    'UPDATE users SET password_hash = $1, must_change_password = TRUE WHERE id = $2 RETURNING id, name, email',
    [hash, req.params.id]
  );
  if (rows.length === 0) throw new AppError('User not found', 404);

  await logAudit(req.user.id, 'reset_password', 'users', parseInt(req.params.id));
  return successResponse(res, { ...rows[0], tempPassword }, 'Password reset');
});

const deactivate = asyncHandler(async (req, res) => {
  const { rows } = await query(
    'UPDATE users SET is_active = FALSE WHERE id = $1 RETURNING id, name',
    [req.params.id]
  );
  if (rows.length === 0) throw new AppError('User not found', 404);
  await logAudit(req.user.id, 'deactivate_user', 'users', parseInt(req.params.id));
  return successResponse(res, rows[0], 'User deactivated');
});

const bulkImport = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('Please upload an Excel or CSV file', 400);

  const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);

  if (data.length === 0) throw new AppError('File is empty', 400);
  if (data.length > 500) throw new AppError('Maximum 500 rows allowed', 400);

  const errors = [];
  const successes = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 2; // Excel row (header is row 1)

    if (!row.name || !row.email || !row.role) {
      errors.push({ row: rowNum, error: 'name, email, and role are required' });
      continue;
    }

    if (!['faculty', 'student'].includes(row.role)) {
      errors.push({ row: rowNum, error: 'role must be faculty or student' });
      continue;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(row.email)) {
      errors.push({ row: rowNum, error: `Invalid email: ${row.email}` });
      continue;
    }

    try {
      const tempPassword = 'Temp@' + Math.random().toString(36).slice(2, 8);
      const hash = await bcrypt.hash(tempPassword, 10);

      let batchId = null;
      if (row.batch_name) {
        const { rows: batches } = await query(
          'SELECT id FROM batches WHERE name ILIKE $1', [row.batch_name.trim()]
        );
        if (batches.length > 0) batchId = batches[0].id;
      } else if (row.batch_id) {
        batchId = parseInt(row.batch_id);
      }

      const { rows } = await query(
        `INSERT INTO users (name, email, phone, role, password_hash, must_change_password, batch_id, is_active)
         VALUES ($1, $2, $3, $4, $5, TRUE, $6, TRUE) RETURNING id, name, email`,
        [row.name.trim(), row.email.toLowerCase().trim(), row.phone || null, row.role, hash, batchId]
      );

      successes.push({ row: rowNum, user: rows[0], tempPassword });
    } catch (err) {
      if (err.code === '23505') {
        errors.push({ row: rowNum, error: `Email already exists: ${row.email}` });
      } else {
        errors.push({ row: rowNum, error: err.message });
      }
    }
  }

  await logAudit(req.user.id, 'bulk_import_users', 'users', null, {
    total: data.length, success: successes.length, errors: errors.length
  });

  return successResponse(res, { successes, errors, total: data.length }, 'Import complete');
});

const getImportTemplate = asyncHandler(async (req, res) => {
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Users');

  sheet.columns = [
    { header: 'name', key: 'name', width: 25 },
    { header: 'email', key: 'email', width: 30 },
    { header: 'phone', key: 'phone', width: 15 },
    { header: 'role', key: 'role', width: 10 },
    { header: 'batch_name', key: 'batch_name', width: 20 },
  ];

  // Style header
  sheet.getRow(1).eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
  });

  // Sample row
  sheet.addRow({ name: 'John Doe', email: 'john@college.edu', phone: '9876543210', role: 'student', batch_name: '2027 Batch' });

  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=user_import_template.xlsx');
  res.send(buffer);
});

module.exports = { getAll, getById, create, update, resetPassword, deactivate, bulkImport, getImportTemplate };
