const ExcelJS = require('exceljs');
const { query } = require('../config/database');
const { asyncHandler, AppError } = require('../utils/helpers');

const styleHeader = (sheet) => {
  sheet.getRow(1).eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
    };
  });
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  // Auto-fit columns
  sheet.columns.forEach(col => {
    let maxLen = col.header ? col.header.length : 10;
    col.eachCell({ includeEmpty: false }, cell => {
      const len = cell.value ? String(cell.value).length : 0;
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.min(maxLen + 4, 50);
  });
};

const sendExcel = async (res, workbook, filename) => {
  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  res.send(buffer);
};

const dailySubmissionReport = asyncHandler(async (req, res) => {
  const { start_date, end_date, batch_id } = req.query;
  if (!start_date || !end_date) throw new AppError('start_date and end_date are required', 400);

  let batchFilter = '';
  const params = [start_date, end_date];
  if (batch_id) { batchFilter = 'AND t.batch_id = $3'; params.push(batch_id); }

  const { rows } = await query(
    `SELECT t.name as team_name, t.project_title, b.name as batch_name,
            lead.roll_number as lead_roll_number, lead.name as lead_name, lead.phone as lead_phone,
            guide.roll_number as guide_roll_number, guide.name as guide_name,
            du.update_date, du.done_today, du.plan_tomorrow, du.blockers,
            du.percent_complete, du.is_late,
            du.created_at as submitted_at
     FROM teams t
     LEFT JOIN batches b ON t.batch_id = b.id
     LEFT JOIN users lead ON t.lead_id = lead.id
     LEFT JOIN users guide ON t.guide_id = guide.id
     LEFT JOIN daily_updates du ON t.id = du.team_id AND du.update_date BETWEEN $1 AND $2
     WHERE t.status = 'active' ${batchFilter}
     ORDER BY du.update_date DESC, t.name`,
    params
  );

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Daily Submissions');

  sheet.columns = [
    { header: 'Date', key: 'update_date', width: 12 },
    { header: 'Team', key: 'team_name', width: 20 },
    { header: 'Project', key: 'project_title', width: 30 },
    { header: 'Batch', key: 'batch_name', width: 15 },
    { header: 'Lead Roll No', key: 'lead_roll_number', width: 15 },
    { header: 'Lead Name', key: 'lead_name', width: 20 },
    { header: 'Phone', key: 'lead_phone', width: 15 },
    { header: 'Guide ID', key: 'guide_roll_number', width: 15 },
    { header: 'Guide Name', key: 'guide_name', width: 20 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Done Today', key: 'done_today', width: 40 },
    { header: 'Plan Tomorrow', key: 'plan_tomorrow', width: 40 },
    { header: 'Blockers', key: 'blockers', width: 30 },
    { header: 'Progress %', key: 'percent_complete', width: 12 },
    { header: 'Late', key: 'is_late', width: 8 },
    { header: 'Submitted At', key: 'submitted_at', width: 20 },
  ];

  for (const r of rows) {
    sheet.addRow({
      ...r,
      status: r.update_date ? 'Submitted' : 'Not Submitted',
      is_late: r.is_late ? 'Yes' : 'No',
      submitted_at: r.submitted_at ? new Date(r.submitted_at).toLocaleString() : '',
    });
  }

  styleHeader(sheet);
  await sendExcel(res, workbook, `daily_submissions_${start_date}_${end_date}.xlsx`);
});

const teamProgressReport = asyncHandler(async (req, res) => {
  const { batch_id } = req.query;
  let batchFilter = '';
  const params = [];
  if (batch_id) { batchFilter = 'WHERE t.batch_id = $1'; params.push(batch_id); }

  const { rows } = await query(
    `SELECT t.name as team_name, t.project_title, t.status, t.progress_percent,
            b.name as batch_name,
            lead.roll_number as lead_roll_number, lead.name as lead_name, lead.phone as lead_phone,
            guide.roll_number as guide_roll_number, guide.name as guide_name,
            t.start_date, t.end_date,
            (SELECT MAX(update_date) FROM daily_updates WHERE team_id = t.id) as last_update,
            (SELECT COUNT(*) FROM daily_updates WHERE team_id = t.id) as total_updates,
            (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
     FROM teams t
     LEFT JOIN batches b ON t.batch_id = b.id
     LEFT JOIN users lead ON t.lead_id = lead.id
     LEFT JOIN users guide ON t.guide_id = guide.id
     ${batchFilter}
     ORDER BY t.name`,
    params
  );

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Team Progress');

  sheet.columns = [
    { header: 'Team', key: 'team_name', width: 20 },
    { header: 'Project', key: 'project_title', width: 30 },
    { header: 'Batch', key: 'batch_name', width: 15 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Progress %', key: 'progress_percent', width: 12 },
    { header: 'Lead Roll No', key: 'lead_roll_number', width: 15 },
    { header: 'Lead Name', key: 'lead_name', width: 20 },
    { header: 'Phone', key: 'lead_phone', width: 15 },
    { header: 'Guide ID', key: 'guide_roll_number', width: 15 },
    { header: 'Guide Name', key: 'guide_name', width: 20 },
    { header: 'Members', key: 'member_count', width: 10 },
    { header: 'Start Date', key: 'start_date', width: 12 },
    { header: 'End Date', key: 'end_date', width: 12 },
    { header: 'Last Update', key: 'last_update', width: 12 },
    { header: 'Total Updates', key: 'total_updates', width: 14 },
  ];

  rows.forEach(r => sheet.addRow(r));
  styleHeader(sheet);
  await sendExcel(res, workbook, 'team_progress_report.xlsx');
});

const papersReport = asyncHandler(async (req, res) => {
  const { batch_id, status } = req.query;
  const conditions = [];
  const params = [];
  let idx = 1;

  if (batch_id) { conditions.push(`t.batch_id = $${idx++}`); params.push(batch_id); }
  if (status) { conditions.push(`p.status = $${idx++}`); params.push(status); }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const { rows } = await query(
    `SELECT p.title as paper_title, p.venue_or_journal, p.submission_id, p.status,
            p.status_date, p.plagiarism_percent, p.notes,
            t.name as team_name, t.project_title, b.name as batch_name
     FROM papers p
     JOIN teams t ON p.team_id = t.id
     LEFT JOIN batches b ON t.batch_id = b.id
     ${where}
     ORDER BY p.status_date DESC NULLS LAST`,
    params
  );

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Papers');

  sheet.columns = [
    { header: 'Paper Title', key: 'paper_title', width: 35 },
    { header: 'Team', key: 'team_name', width: 20 },
    { header: 'Batch', key: 'batch_name', width: 15 },
    { header: 'Venue/Journal', key: 'venue_or_journal', width: 25 },
    { header: 'Submission ID', key: 'submission_id', width: 15 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Status Date', key: 'status_date', width: 12 },
    { header: 'Plagiarism %', key: 'plagiarism_percent', width: 14 },
    { header: 'Notes', key: 'notes', width: 30 },
  ];

  rows.forEach(r => sheet.addRow(r));
  styleHeader(sheet);
  await sendExcel(res, workbook, 'papers_report.xlsx');
});

const usersReport = asyncHandler(async (req, res) => {
  const { role, batch_id } = req.query;
  const conditions = [];
  const params = [];
  let idx = 1;

  if (role) { conditions.push(`u.role = $${idx++}`); params.push(role); }
  if (batch_id) { conditions.push(`u.batch_id = $${idx++}`); params.push(batch_id); }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const { rows } = await query(
    `SELECT u.roll_number, u.name, u.email, u.phone, u.role, u.is_active,
            b.name as batch_name,
            (SELECT string_agg(t.name, ', ') FROM team_members tm JOIN teams t ON tm.team_id = t.id WHERE tm.user_id = u.id) as teams
     FROM users u
     LEFT JOIN batches b ON u.batch_id = b.id
     ${where}
     ORDER BY u.role, u.roll_number, u.name`,
    params
  );

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Users');

  sheet.columns = [
    { header: 'Roll Number / ID', key: 'roll_number', width: 20 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Role', key: 'role', width: 12 },
    { header: 'Batch', key: 'batch_name', width: 15 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'Active', key: 'is_active', width: 8 },
    { header: 'Teams', key: 'teams', width: 30 },
  ];

  rows.forEach(r => sheet.addRow({ ...r, is_active: r.is_active ? 'Yes' : 'No' }));
  styleHeader(sheet);
  await sendExcel(res, workbook, 'users_report.xlsx');
});

const reviewsReport = asyncHandler(async (req, res) => {
  const { batch_id } = req.query;
  let batchFilter = '';
  const params = [];
  if (batch_id) { batchFilter = 'WHERE wr.batch_id = $1'; params.push(batch_id); }

  const { rows } = await query(
    `SELECT wr.week_no, wr.review_date, wr.suggestions,
            b.name as batch_name, u.name as created_by_name,
            (SELECT COUNT(*) FROM review_acks WHERE review_id = wr.id) as seen_count,
            wr.attachment_link
     FROM weekly_reviews wr
     LEFT JOIN batches b ON wr.batch_id = b.id
     LEFT JOIN users u ON wr.created_by = u.id
     ${batchFilter}
     ORDER BY wr.review_date DESC`,
    params
  );

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Reviews');

  sheet.columns = [
    { header: 'Week', key: 'week_no', width: 8 },
    { header: 'Date', key: 'review_date', width: 12 },
    { header: 'Batch', key: 'batch_name', width: 15 },
    { header: 'Suggestions', key: 'suggestions', width: 50 },
    { header: 'Created By', key: 'created_by_name', width: 20 },
    { header: 'Seen By', key: 'seen_count', width: 10 },
    { header: 'Attachment', key: 'attachment_link', width: 30 },
  ];

  rows.forEach(r => sheet.addRow(r));
  styleHeader(sheet);
  await sendExcel(res, workbook, 'reviews_report.xlsx');
});

const followupsReport = asyncHandler(async (req, res) => {
  const { team_id } = req.query;
  let teamFilter = '';
  const params = [];
  if (team_id) { teamFilter = 'WHERE f.team_id = $1'; params.push(team_id); }

  const { rows } = await query(
    `SELECT f.called_on, f.note, t.name as team_name, u.name as created_by_name
     FROM followups f
     JOIN teams t ON f.team_id = t.id
     JOIN users u ON f.created_by = u.id
     ${teamFilter}
     ORDER BY f.called_on DESC`,
    params
  );

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Follow-ups');

  sheet.columns = [
    { header: 'Date/Time', key: 'called_on', width: 20 },
    { header: 'Team', key: 'team_name', width: 20 },
    { header: 'Note', key: 'note', width: 50 },
    { header: 'Created By', key: 'created_by_name', width: 20 },
  ];

  rows.forEach(r => sheet.addRow({ ...r, called_on: r.called_on ? new Date(r.called_on).toLocaleString() : '' }));
  styleHeader(sheet);
  await sendExcel(res, workbook, 'followups_report.xlsx');
});

const reviewAcksReport = asyncHandler(async (req, res) => {
  const { review_id } = req.query;
  if (!review_id) throw new AppError('review_id is required', 400);

  const { rows: review } = await query(
    `SELECT wr.*, b.name as batch_name FROM weekly_reviews wr LEFT JOIN batches b ON wr.batch_id = b.id WHERE wr.id = $1`,
    [review_id]
  );
  if (review.length === 0) throw new AppError('Review not found', 404);

  const { rows } = await query(
    `SELECT u.name, u.email, u.phone,
            ra.seen_at,
            CASE WHEN ra.seen_at IS NOT NULL THEN 'Seen' ELSE 'Not Seen' END as status
     FROM team_members tm
     JOIN teams t ON tm.team_id = t.id
     JOIN users u ON tm.user_id = u.id
     LEFT JOIN review_acks ra ON ra.review_id = $1 AND ra.user_id = u.id
     WHERE t.batch_id = $2
     ORDER BY ra.seen_at IS NULL, u.name`,
    [review_id, review[0].batch_id]
  );

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Acknowledgements');

  sheet.columns = [
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'Status', key: 'status', width: 10 },
    { header: 'Seen At', key: 'seen_at', width: 20 },
  ];

  rows.forEach(r => sheet.addRow({ ...r, seen_at: r.seen_at ? new Date(r.seen_at).toLocaleString() : '' }));
  styleHeader(sheet);
  await sendExcel(res, workbook, `review_acks_week${review[0].week_no}.xlsx`);
});

module.exports = {
  dailySubmissionReport, teamProgressReport, papersReport,
  usersReport, reviewsReport, followupsReport, reviewAcksReport
};
