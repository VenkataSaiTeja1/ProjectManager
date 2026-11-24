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
    conditions.push(`(u.name ILIKE $${idx} OR u.roll_number ILIKE $${idx} OR (u.email IS NOT NULL AND u.email ILIKE $${idx}))`);
    params.push(`%${search}%`);
    idx++;
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const countRes = await query(`SELECT COUNT(*) FROM users u ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);

  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.phone, u.role, u.roll_number, u.must_change_password, u.batch_id, u.is_active, u.created_at,
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
    `SELECT u.id, u.name, u.email, u.phone, u.role, u.roll_number, u.must_change_password, u.batch_id, u.is_active, u.created_at,
            b.name as batch_name
     FROM users u LEFT JOIN batches b ON u.batch_id = b.id
     WHERE u.id = $1`,
    [req.params.id]
  );
  if (rows.length === 0) throw new AppError('User not found', 404);
  return successResponse(res, rows[0]);
});

const create = asyncHandler(async (req, res) => {
  const { roll_number, name, email, phone, role, password, batch_id } = req.body;

  // Default password per user specification:
  // Student: Student@123
  // Faculty: Faculty@123
  // Admin: Admin@123
  let initialPassword = password;
  if (!initialPassword || initialPassword.trim() === '') {
    if (role === 'student') initialPassword = 'Student@123';
    else if (role === 'faculty') initialPassword = 'Faculty@123';
    else initialPassword = 'Admin@123';
  }

  const hash = await bcrypt.hash(initialPassword, 12);
  const cleanRoll = roll_number.trim();
  const cleanEmail = email && email.trim() ? email.toLowerCase().trim() : null;

  const { rows } = await query(
    `INSERT INTO users (roll_number, name, email, phone, role, password_hash, must_change_password, batch_id, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, TRUE)
     RETURNING id, roll_number, name, email, phone, role, batch_id, is_active, created_at`,
    [cleanRoll, name.trim(), cleanEmail, phone || null, role, hash, batch_id || null]
  );

  await logAudit(req.user.id, 'create_user', 'users', rows[0].id, { roll_number: cleanRoll, name, role });
  return successResponse(res, { ...rows[0], defaultPassword: initialPassword }, 'User created', 201);
});

const update = asyncHandler(async (req, res) => {
  const { roll_number, name, email, phone, role, batch_id, is_active } = req.body;
  const { rows: existing } = await query('SELECT id FROM users WHERE id = $1', [req.params.id]);
  if (existing.length === 0) throw new AppError('User not found', 404);

  const fields = [];
  const params = [];
  let idx = 1;

  if (roll_number !== undefined) { fields.push(`roll_number = $${idx++}`); params.push(roll_number.trim()); }
  if (name !== undefined) { fields.push(`name = $${idx++}`); params.push(name.trim()); }
  if (email !== undefined) { fields.push(`email = $${idx++}`); params.push(email ? email.toLowerCase().trim() : null); }
  if (phone !== undefined) { fields.push(`phone = $${idx++}`); params.push(phone || null); }
  if (role !== undefined) { fields.push(`role = $${idx++}`); params.push(role); }
  if (batch_id !== undefined) { fields.push(`batch_id = $${idx++}`); params.push(batch_id); }
  if (is_active !== undefined) { fields.push(`is_active = $${idx++}`); params.push(is_active); }

  if (fields.length === 0) throw new AppError('No fields to update', 400);

  params.push(req.params.id);
  const { rows } = await query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}
     RETURNING id, roll_number, name, email, phone, role, batch_id, is_active`,
    params
  );

  await logAudit(req.user.id, 'update_user', 'users', rows[0].id, req.body);
  return successResponse(res, rows[0], 'User updated');
});

const resetPassword = asyncHandler(async (req, res) => {
  const { rows: userRows } = await query('SELECT id, role, roll_number FROM users WHERE id = $1', [req.params.id]);
  if (userRows.length === 0) throw new AppError('User not found', 404);

  const user = userRows[0];
  const defaultPassword = user.role === 'student' ? 'Student@123' : user.role === 'faculty' ? 'Faculty@123' : 'Admin@123';
  const hash = await bcrypt.hash(defaultPassword, 12);

  const { rows } = await query(
    'UPDATE users SET password_hash = $1, must_change_password = TRUE WHERE id = $2 RETURNING id, name, roll_number',
    [hash, req.params.id]
  );

  await logAudit(req.user.id, 'reset_password', 'users', parseInt(req.params.id, 10));
  return successResponse(res, { ...rows[0], defaultPassword }, `Password reset to ${defaultPassword}`);
});

const remove = asyncHandler(async (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  if (targetId === req.user.id) {
    throw new AppError('You cannot delete your own account.', 400);
  }

  const { rows } = await query('DELETE FROM users WHERE id = $1 RETURNING id, name, roll_number, role', [targetId]);
  if (rows.length === 0) throw new AppError('User not found', 404);

  await logAudit(req.user.id, 'delete_user', 'users', targetId, { name: rows[0].name, roll_number: rows[0].roll_number });
  return successResponse(res, rows[0], `User ${rows[0].name} deleted successfully`);
});

const bulkImport = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('Please upload an Excel or CSV file', 400);

  const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);

  if (data.length === 0) throw new AppError('File is empty', 400);
  if (data.length > 1000) throw new AppError('Maximum 1000 rows allowed per import', 400);

  const errors = [];
  const successes = [];

  const studentHash = await bcrypt.hash('Student@123', 10);
  const facultyHash = await bcrypt.hash('Faculty@123', 10);

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 2;

    const rollNumber = (row.roll_number || row.roll_no || row.Roll_Number || row.id || '').toString().trim();
    const name = (row.name || row.Name || row.full_name || '').toString().trim();
    const role = (row.role || row.Role || 'student').toString().trim().toLowerCase();

    if (!rollNumber || !name) {
      errors.push({ row: rowNum, error: 'roll_number and name are required' });
      continue;
    }

    if (!['faculty', 'student'].includes(role)) {
      errors.push({ row: rowNum, error: `role must be faculty or student (got ${role})` });
      continue;
    }

    try {
      let batchId = null;
      if (row.batch_name) {
        const { rows: batches } = await query(
          'SELECT id FROM batches WHERE name ILIKE $1', [row.batch_name.toString().trim()]
        );
        if (batches.length > 0) batchId = batches[0].id;
      } else if (row.batch_id) {
        batchId = parseInt(row.batch_id, 10);
      }

      const email = row.email ? row.email.toString().trim().toLowerCase() : null;
      const phone = row.phone ? row.phone.toString().trim() : null;
      const hash = role === 'student' ? studentHash : facultyHash;

      // Check if user with this roll number already exists
      const { rows: existing } = await query(
        'SELECT id FROM users WHERE LOWER(TRIM(roll_number)) = LOWER(TRIM($1))',
        [rollNumber]
      );

      let savedUser;
      if (existing.length > 0) {
        const { rows: updated } = await query(
          `UPDATE users
           SET name = $1, batch_id = COALESCE($2, batch_id), role = $3,
               email = COALESCE($4, email), phone = COALESCE($5, phone)
           WHERE id = $6
           RETURNING id, roll_number, name, role`,
          [name, batchId, role, email, phone, existing[0].id]
        );
        savedUser = updated[0];
      } else {
        const { rows: inserted } = await query(
          `INSERT INTO users (roll_number, name, email, phone, role, password_hash, must_change_password, batch_id, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, TRUE)
           RETURNING id, roll_number, name, role`,
          [rollNumber, name, email, phone, role, hash, batchId]
        );
        savedUser = inserted[0];
      }

      successes.push({ row: rowNum, user: savedUser });
    } catch (err) {
      errors.push({ row: rowNum, error: err.message });
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
    { header: 'roll_number', key: 'roll_number', width: 20 },
    { header: 'name', key: 'name', width: 25 },
    { header: 'role', key: 'role', width: 12 },
    { header: 'batch_name', key: 'batch_name', width: 20 },
  ];

  sheet.getRow(1).eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
  });

  // Sample student and faculty rows
  sheet.addRow({ roll_number: '231FA04001', name: 'Arun Patel', role: 'student', batch_name: '2027 Batch' });
  sheet.addRow({ roll_number: 'FAC001', name: 'Dr. Ramesh Kumar', role: 'faculty', batch_name: '' });

  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=user_import_template.xlsx');
  res.send(buffer);
});

module.exports = { getAll, getById, create, update, resetPassword, remove, bulkImport, getImportTemplate };
