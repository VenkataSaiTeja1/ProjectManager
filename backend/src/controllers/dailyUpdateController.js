const { query, transaction } = require('../config/database');
const { asyncHandler, successResponse, paginatedResponse, AppError } = require('../utils/helpers');
const { logAudit } = require('../utils/audit');

const TIMEZONE = process.env.TIMEZONE || 'Asia/Kolkata';
const CUTOFF_TIME = process.env.DAILY_CUTOFF_TIME || '20:00';

const submit = asyncHandler(async (req, res) => {
  const { done_today, plan_tomorrow, blockers, percent_complete, link } = req.body;

  // Find team where user is lead
  const { rows: teamRows } = await query(
    'SELECT t.id, t.batch_id FROM teams t WHERE t.lead_id = $1',
    [req.user.id]
  );
  if (teamRows.length === 0) throw new AppError('You are not a team lead', 403);

  const team = teamRows[0];
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-CA', { timeZone: TIMEZONE });

  // Check if today is a holiday
  const { rows: holidays } = await query(
    'SELECT id FROM holidays WHERE holiday_date = $1', [dateStr]
  );
  if (holidays.length > 0) throw new AppError('Today is a holiday. No update needed.', 400);

  // Check if late
  const timeStr = now.toLocaleTimeString('en-GB', { timeZone: TIMEZONE, hour12: false }).slice(0, 5);
  const isLate = timeStr > CUTOFF_TIME;

  // Check if already submitted today
  const { rows: existing } = await query(
    'SELECT id FROM daily_updates WHERE team_id = $1 AND update_date = $2',
    [team.id, dateStr]
  );

  if (existing.length > 0) {
    // Save history before updating
    const { rows: oldData } = await query('SELECT * FROM daily_updates WHERE id = $1', [existing[0].id]);
    await query(
      'INSERT INTO daily_update_history (update_id, snapshot) VALUES ($1, $2)',
      [existing[0].id, JSON.stringify(oldData[0])]
    );

    const { rows: updated } = await query(
      `UPDATE daily_updates SET done_today = $1, plan_tomorrow = $2, blockers = $3,
       percent_complete = $4, link = $5, updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [done_today, plan_tomorrow || null, blockers || null, percent_complete, link || null, existing[0].id]
    );

    // Update team progress
    await query('UPDATE teams SET progress_percent = $1 WHERE id = $2', [percent_complete, team.id]);

    await logAudit(req.user.id, 'edit_daily_update', 'daily_updates', updated[0].id);
    return successResponse(res, updated[0], 'Update edited');
  }

  const { rows } = await query(
    `INSERT INTO daily_updates (team_id, submitted_by, update_date, done_today, plan_tomorrow, blockers, percent_complete, link, is_late)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [team.id, req.user.id, dateStr, done_today, plan_tomorrow || null, blockers || null, percent_complete, link || null, isLate]
  );

  // Update team progress
  await query('UPDATE teams SET progress_percent = $1 WHERE id = $2', [percent_complete, team.id]);

  await logAudit(req.user.id, 'submit_daily_update', 'daily_updates', rows[0].id);
  return successResponse(res, rows[0], isLate ? 'Update submitted (late)' : 'Update submitted', 201);
});

const getTeamUpdates = asyncHandler(async (req, res) => {
  const { team_id } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  // Check access
  if (req.user.role === 'faculty') {
    const { rows } = await query('SELECT id FROM teams WHERE id = $1 AND guide_id = $2', [team_id, req.user.id]);
    if (rows.length === 0) throw new AppError('Access denied', 403);
  }
  if (req.user.role === 'student') {
    const { rows } = await query('SELECT team_id FROM team_members WHERE team_id = $1 AND user_id = $2', [team_id, req.user.id]);
    if (rows.length === 0) throw new AppError('Access denied', 403);
  }

  const countRes = await query('SELECT COUNT(*) FROM daily_updates WHERE team_id = $1', [team_id]);
  const total = parseInt(countRes.rows[0].count);

  const { rows } = await query(
    `SELECT du.*, u.name as submitted_by_name,
            (SELECT COUNT(*) FROM update_comments WHERE update_id = du.id) as comment_count
     FROM daily_updates du
     JOIN users u ON du.submitted_by = u.id
     WHERE du.team_id = $1
     ORDER BY du.update_date DESC
     LIMIT $2 OFFSET $3`,
    [team_id, limit, offset]
  );

  return paginatedResponse(res, rows, total, page, limit);
});

const getUpdateById = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT du.*, u.name as submitted_by_name
     FROM daily_updates du JOIN users u ON du.submitted_by = u.id
     WHERE du.id = $1`,
    [req.params.id]
  );
  if (rows.length === 0) throw new AppError('Update not found', 404);

  // Get comments
  const { rows: comments } = await query(
    `SELECT uc.*, u.name as user_name, u.role as user_role
     FROM update_comments uc JOIN users u ON uc.user_id = u.id
     WHERE uc.update_id = $1 ORDER BY uc.created_at ASC`,
    [req.params.id]
  );

  // Get edit history
  const { rows: history } = await query(
    'SELECT * FROM daily_update_history WHERE update_id = $1 ORDER BY edited_at DESC',
    [req.params.id]
  );

  return successResponse(res, { ...rows[0], comments, history });
});

const addComment = asyncHandler(async (req, res) => {
  const { comment } = req.body;

  // Verify update exists and check access
  const { rows: update } = await query('SELECT team_id FROM daily_updates WHERE id = $1', [req.params.id]);
  if (update.length === 0) throw new AppError('Update not found', 404);

  if (req.user.role === 'faculty') {
    const { rows } = await query('SELECT id FROM teams WHERE id = $1 AND guide_id = $2', [update[0].team_id, req.user.id]);
    if (rows.length === 0) throw new AppError('Access denied', 403);
  }

  const { rows } = await query(
    'INSERT INTO update_comments (update_id, user_id, comment) VALUES ($1, $2, $3) RETURNING *',
    [req.params.id, req.user.id, comment]
  );

  // Create notification for team lead
  const { rows: team } = await query('SELECT lead_id FROM teams WHERE id = $1', [update[0].team_id]);
  if (team.length > 0 && team[0].lead_id !== req.user.id) {
    await query(
      `INSERT INTO notifications (user_id, type, title, message, entity, entity_id)
       VALUES ($1, 'comment', 'New comment on your update', $2, 'daily_updates', $3)`,
      [team[0].lead_id, `${req.user.name}: ${comment.substring(0, 100)}`, parseInt(req.params.id)]
    );
  }

  await logAudit(req.user.id, 'add_comment', 'update_comments', rows[0].id);
  return successResponse(res, rows[0], 'Comment added', 201);
});

const dailyTracker = asyncHandler(async (req, res) => {
  const { date, batch_id } = req.query;
  const trackDate = date || new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE });

  // Check if holiday
  const { rows: holidays } = await query('SELECT reason FROM holidays WHERE holiday_date = $1', [trackDate]);
  const isHoliday = holidays.length > 0;

  let batchFilter = '';
  const params = [trackDate];

  if (batch_id) {
    batchFilter = 'AND t.batch_id = $2';
    params.push(batch_id);
  }

  // Get all active teams with their update status for the date
  const { rows: teams } = await query(
    `SELECT t.id as team_id, t.name as team_name, t.project_title, t.batch_id,
            b.name as batch_name,
            lead.id as lead_id, lead.name as lead_name, lead.roll_number as lead_roll_number, lead.email as lead_email, lead.phone as lead_phone,
            guide.name as guide_name, guide.roll_number as guide_roll_number,
            du.id as update_id, du.done_today, du.plan_tomorrow, du.blockers,
            du.percent_complete, du.is_late, du.created_at as submitted_at,
            (SELECT MAX(update_date) FROM daily_updates WHERE team_id = t.id AND update_date < $1) as last_update_before
     FROM teams t
     LEFT JOIN batches b ON t.batch_id = b.id
     LEFT JOIN users lead ON t.lead_id = lead.id
     LEFT JOIN users guide ON t.guide_id = guide.id
     LEFT JOIN daily_updates du ON t.id = du.team_id AND du.update_date = $1
     WHERE t.status = 'active' ${batchFilter}
     ORDER BY du.id IS NULL DESC, t.name ASC`,
    params
  );

  const submitted = [];
  const notSubmitted = [];

  for (const team of teams) {
    if (team.update_id) {
      submitted.push(team);
    } else {
      // Calculate days since last update
      let daysSinceUpdate = null;
      if (team.last_update_before) {
        const lastDate = new Date(team.last_update_before);
        const currentDate = new Date(trackDate);
        daysSinceUpdate = Math.floor((currentDate - lastDate) / (1000 * 60 * 60 * 24));
      }
      notSubmitted.push({ ...team, days_since_update: daysSinceUpdate });
    }
  }

  return successResponse(res, {
    date: trackDate,
    isHoliday,
    holidayReason: isHoliday ? holidays[0].reason : null,
    summary: {
      total: teams.length,
      submitted: submitted.length,
      late: submitted.filter(t => t.is_late).length,
      notSubmitted: notSubmitted.length,
    },
    submitted,
    notSubmitted,
  });
});

const getMyUpdate = asyncHandler(async (req, res) => {
  const { rows: teamRows } = await query(
    'SELECT t.id FROM teams t WHERE t.lead_id = $1', [req.user.id]
  );

  if (teamRows.length === 0) {
    // Not a lead, check membership
    const { rows: memberRows } = await query(
      'SELECT tm.team_id FROM team_members tm WHERE tm.user_id = $1 LIMIT 1', [req.user.id]
    );
    if (memberRows.length === 0) return successResponse(res, { update: null, team: null, streak: 0 });

    const teamId = memberRows[0].team_id;
    const dateStr = new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE });
    const { rows } = await query(
      'SELECT * FROM daily_updates WHERE team_id = $1 AND update_date = $2',
      [teamId, dateStr]
    );
    return successResponse(res, { update: rows[0] || null, team: { id: teamId }, isLead: false });
  }

  const teamId = teamRows[0].id;
  const dateStr = new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE });

  // Today's update
  const { rows } = await query(
    'SELECT * FROM daily_updates WHERE team_id = $1 AND update_date = $2',
    [teamId, dateStr]
  );

  // Calculate streak
  const { rows: streakRows } = await query(
    `SELECT update_date FROM daily_updates WHERE team_id = $1 ORDER BY update_date DESC LIMIT 30`,
    [teamId]
  );

  let streak = 0;
  const today = new Date(dateStr);
  for (let i = 0; i < streakRows.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    const expStr = expected.toISOString().split('T')[0];

    // Skip weekends (optional) and holidays
    const { rows: hol } = await query('SELECT id FROM holidays WHERE holiday_date = $1', [expStr]);
    if (hol.length > 0) { today.setDate(today.getDate()); continue; } // skip holiday

    if (streakRows[i].update_date.toISOString().split('T')[0] === expStr) {
      streak++;
    } else {
      break;
    }
  }

  // Recent updates
  const { rows: recent } = await query(
    'SELECT * FROM daily_updates WHERE team_id = $1 ORDER BY update_date DESC LIMIT 7',
    [teamId]
  );

  // Check if editing is still allowed (before midnight)
  const canEdit = true; // Frontend handles display, backend allows same-day edit

  return successResponse(res, {
    update: rows[0] || null,
    team: { id: teamId },
    isLead: true,
    streak,
    recentUpdates: recent,
    canEdit,
  });
});

module.exports = { submit, getTeamUpdates, getUpdateById, addComment, dailyTracker, getMyUpdate };
