const { query, transaction } = require('../config/database');
const { asyncHandler, successResponse, paginatedResponse, AppError } = require('../utils/helpers');
const { logAudit } = require('../utils/audit');
const XLSX = require('xlsx');

const getAll = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, batch_id, status, search, guide_id } = req.query;
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];
  let idx = 1;

  // Faculty can only see their own teams
  if (req.user.role === 'faculty') {
    conditions.push(`t.guide_id = $${idx++}`);
    params.push(req.user.id);
  } else if (guide_id) {
    conditions.push(`t.guide_id = $${idx++}`);
    params.push(guide_id);
  }

  // Student can only see their own team
  if (req.user.role === 'student') {
    conditions.push(`t.id IN (SELECT team_id FROM team_members WHERE user_id = $${idx++})`);
    params.push(req.user.id);
  }

  if (batch_id) { conditions.push(`t.batch_id = $${idx++}`); params.push(batch_id); }
  if (status) { conditions.push(`t.status = $${idx++}`); params.push(status); }
  if (search) {
    conditions.push(`(t.name ILIKE $${idx} OR t.project_title ILIKE $${idx})`);
    params.push(`%${search}%`);
    idx++;
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const countRes = await query(`SELECT COUNT(*) FROM teams t ${where}`, params);
  const total = parseInt(countRes.rows[0].count);

  const { rows } = await query(
    `SELECT t.*, b.name as batch_name,
            lead.name as lead_name, lead.email as lead_email, lead.phone as lead_phone,
            guide.name as guide_name, guide.email as guide_email,
            (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count,
            (SELECT MAX(update_date) FROM daily_updates WHERE team_id = t.id) as last_update_date
     FROM teams t
     LEFT JOIN batches b ON t.batch_id = b.id
     LEFT JOIN users lead ON t.lead_id = lead.id
     LEFT JOIN users guide ON t.guide_id = guide.id
     ${where}
     ORDER BY t.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );

  return paginatedResponse(res, rows, total, page, limit);
});

const getById = asyncHandler(async (req, res) => {
  // Check access
  if (req.user.role === 'faculty') {
    const { rows: check } = await query('SELECT id FROM teams WHERE id = $1 AND guide_id = $2', [req.params.id, req.user.id]);
    if (check.length === 0) throw new AppError('Access denied', 403);
  }
  if (req.user.role === 'student') {
    const { rows: check } = await query('SELECT team_id FROM team_members WHERE team_id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (check.length === 0) throw new AppError('Access denied', 403);
  }

  const { rows } = await query(
    `SELECT t.*, b.name as batch_name,
            lead.name as lead_name, lead.email as lead_email, lead.phone as lead_phone,
            guide.name as guide_name, guide.email as guide_email
     FROM teams t
     LEFT JOIN batches b ON t.batch_id = b.id
     LEFT JOIN users lead ON t.lead_id = lead.id
     LEFT JOIN users guide ON t.guide_id = guide.id
     WHERE t.id = $1`,
    [req.params.id]
  );
  if (rows.length === 0) throw new AppError('Team not found', 404);

  // Get members
  const { rows: members } = await query(
    `SELECT u.id, u.name, u.email, u.phone, u.role,
            CASE WHEN u.id = $2 THEN true ELSE false END as is_lead
     FROM team_members tm JOIN users u ON tm.user_id = u.id
     WHERE tm.team_id = $1 ORDER BY u.name`,
    [req.params.id, rows[0].lead_id]
  );

  return successResponse(res, { ...rows[0], members });
});

const create = asyncHandler(async (req, res) => {
  const { batch_id, name, project_title, project_description, lead_id, guide_id, status, progress_percent, start_date, end_date, member_ids } = req.body;

  const result = await transaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO teams (batch_id, name, project_title, project_description, lead_id, guide_id, status, progress_percent, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [batch_id, name, project_title || null, project_description || null, lead_id || null, guide_id || null, status || 'active', progress_percent || 0, start_date || null, end_date || null]
    );

    const team = rows[0];

    // Add members
    if (member_ids && member_ids.length > 0) {
      for (const userId of member_ids) {
        await client.query(
          'INSERT INTO team_members (team_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [team.id, userId]
        );
      }
    }

    // Always add lead as member
    if (lead_id) {
      await client.query(
        'INSERT INTO team_members (team_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [team.id, lead_id]
      );
    }

    return team;
  });

  await logAudit(req.user.id, 'create_team', 'teams', result.id, { name, batch_id });
  return successResponse(res, result, 'Team created', 201);
});

const update = asyncHandler(async (req, res) => {
  const { batch_id, name, project_title, project_description, lead_id, guide_id, status, progress_percent, start_date, end_date, member_ids } = req.body;

  const result = await transaction(async (client) => {
    const fields = [];
    const params = [];
    let idx = 1;

    if (batch_id !== undefined) { fields.push(`batch_id = $${idx++}`); params.push(batch_id); }
    if (name !== undefined) { fields.push(`name = $${idx++}`); params.push(name); }
    if (project_title !== undefined) { fields.push(`project_title = $${idx++}`); params.push(project_title); }
    if (project_description !== undefined) { fields.push(`project_description = $${idx++}`); params.push(project_description); }
    if (lead_id !== undefined) { fields.push(`lead_id = $${idx++}`); params.push(lead_id); }
    if (guide_id !== undefined) { fields.push(`guide_id = $${idx++}`); params.push(guide_id); }
    if (status !== undefined) { fields.push(`status = $${idx++}`); params.push(status); }
    if (progress_percent !== undefined) { fields.push(`progress_percent = $${idx++}`); params.push(progress_percent); }
    if (start_date !== undefined) { fields.push(`start_date = $${idx++}`); params.push(start_date); }
    if (end_date !== undefined) { fields.push(`end_date = $${idx++}`); params.push(end_date); }

    if (fields.length > 0) {
      params.push(req.params.id);
      const { rows } = await client.query(
        `UPDATE teams SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
        params
      );
      if (rows.length === 0) throw new AppError('Team not found', 404);
    }

    // Update members if provided
    if (member_ids !== undefined) {
      await client.query('DELETE FROM team_members WHERE team_id = $1', [req.params.id]);
      for (const userId of member_ids) {
        await client.query(
          'INSERT INTO team_members (team_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [req.params.id, userId]
        );
      }
    }

    const { rows: updated } = await client.query('SELECT * FROM teams WHERE id = $1', [req.params.id]);
    return updated[0];
  });

  await logAudit(req.user.id, 'update_team', 'teams', parseInt(req.params.id), req.body);
  return successResponse(res, result, 'Team updated');
});

const remove = asyncHandler(async (req, res) => {
  const { rows } = await query('DELETE FROM teams WHERE id = $1 RETURNING id', [req.params.id]);
  if (rows.length === 0) throw new AppError('Team not found', 404);
  await logAudit(req.user.id, 'delete_team', 'teams', parseInt(req.params.id));
  return successResponse(res, null, 'Team deleted');
});

const addMember = asyncHandler(async (req, res) => {
  const { user_id } = req.body;
  await query(
    'INSERT INTO team_members (team_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [req.params.id, user_id]
  );
  await logAudit(req.user.id, 'add_member', 'teams', parseInt(req.params.id), { user_id });
  return successResponse(res, null, 'Member added');
});

const removeMember = asyncHandler(async (req, res) => {
  await query(
    'DELETE FROM team_members WHERE team_id = $1 AND user_id = $2',
    [req.params.id, req.params.userId]
  );
  await logAudit(req.user.id, 'remove_member', 'teams', parseInt(req.params.id), { user_id: req.params.userId });
  return successResponse(res, null, 'Member removed');
});

const bulkImport = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('Please upload an Excel or CSV file', 400);

  const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);

  const errors = [];
  const successes = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 2;

    if (!row.team_name || !row.batch_name) {
      errors.push({ row: rowNum, error: 'team_name and batch_name are required' });
      continue;
    }

    try {
      const { rows: batches } = await query('SELECT id FROM batches WHERE name ILIKE $1', [row.batch_name.trim()]);
      if (batches.length === 0) {
        errors.push({ row: rowNum, error: `Batch not found: ${row.batch_name}` });
        continue;
      }

      let leadId = null;
      if (row.lead_email) {
        const { rows: leads } = await query('SELECT id FROM users WHERE email = $1', [row.lead_email.toLowerCase().trim()]);
        if (leads.length > 0) leadId = leads[0].id;
      }

      let guideId = null;
      if (row.guide_email) {
        const { rows: guides } = await query('SELECT id FROM users WHERE email = $1 AND role = $2', [row.guide_email.toLowerCase().trim(), 'faculty']);
        if (guides.length > 0) guideId = guides[0].id;
      }

      const { rows } = await query(
        `INSERT INTO teams (batch_id, name, project_title, project_description, lead_id, guide_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [batches[0].id, row.team_name.trim(), row.project_title || null, row.project_description || null, leadId, guideId]
      );

      // Add lead as member
      if (leadId) {
        await query('INSERT INTO team_members (team_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [rows[0].id, leadId]);
      }

      // Add additional members by email (comma separated)
      if (row.member_emails) {
        const emails = row.member_emails.split(',').map(e => e.trim().toLowerCase());
        for (const email of emails) {
          const { rows: users } = await query('SELECT id FROM users WHERE email = $1', [email]);
          if (users.length > 0) {
            await query('INSERT INTO team_members (team_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [rows[0].id, users[0].id]);
          }
        }
      }

      successes.push({ row: rowNum, team: rows[0] });
    } catch (err) {
      errors.push({ row: rowNum, error: err.message });
    }
  }

  await logAudit(req.user.id, 'bulk_import_teams', 'teams', null, { total: data.length, success: successes.length, errors: errors.length });
  return successResponse(res, { successes, errors, total: data.length }, 'Import complete');
});

const getTeamImportTemplate = asyncHandler(async (req, res) => {
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Teams');

  sheet.columns = [
    { header: 'team_name', key: 'team_name', width: 20 },
    { header: 'batch_name', key: 'batch_name', width: 20 },
    { header: 'project_title', key: 'project_title', width: 30 },
    { header: 'project_description', key: 'project_description', width: 40 },
    { header: 'lead_email', key: 'lead_email', width: 25 },
    { header: 'guide_email', key: 'guide_email', width: 25 },
    { header: 'member_emails', key: 'member_emails', width: 50 },
  ];

  sheet.getRow(1).eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
  });

  sheet.addRow({
    team_name: 'Team Alpha', batch_name: '2027 Batch', project_title: 'AI Project',
    project_description: 'Description', lead_email: 'lead@student.edu', guide_email: 'guide@college.edu',
    member_emails: 'member1@student.edu,member2@student.edu'
  });

  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=team_import_template.xlsx');
  res.send(buffer);
});

module.exports = { getAll, getById, create, update, remove, addMember, removeMember, bulkImport, getTeamImportTemplate };
