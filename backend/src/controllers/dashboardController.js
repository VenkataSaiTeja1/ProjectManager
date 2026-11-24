const { query } = require('../config/database');
const { asyncHandler, successResponse } = require('../utils/helpers');

const TIMEZONE = process.env.TIMEZONE || 'Asia/Kolkata';

const adminDashboard = asyncHandler(async (req, res) => {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE });

  // Summary cards
  const [
    totalTeams, activeTeams, completedTeams, pendingReviewTeams,
    todayUpdates, lateUpdates, totalStudents, totalFaculty,
    papersStats, recentFollowups
  ] = await Promise.all([
    query("SELECT COUNT(*) FROM teams"),
    query("SELECT COUNT(*) FROM teams WHERE status = 'active'"),
    query("SELECT COUNT(*) FROM teams WHERE status = 'completed'"),
    query("SELECT COUNT(*) FROM teams WHERE status = 'pending_review'"),
    query("SELECT COUNT(*) FROM daily_updates WHERE update_date = $1", [today]),
    query("SELECT COUNT(*) FROM daily_updates WHERE update_date = $1 AND is_late = TRUE", [today]),
    query("SELECT COUNT(*) FROM users WHERE role = 'student' AND is_active = TRUE"),
    query("SELECT COUNT(*) FROM users WHERE role = 'faculty' AND is_active = TRUE"),
    query(`SELECT
      COUNT(*) FILTER (WHERE status = 'submitted') as submitted,
      COUNT(*) FILTER (WHERE status = 'under_review') as under_review,
      COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
      COUNT(*) FILTER (WHERE status = 'published') as published,
      COUNT(*) as total
      FROM papers`),
    query("SELECT COUNT(*) FROM followups WHERE created_at > NOW() - INTERVAL '7 days'"),
  ]);

  const totalActiveTeams = parseInt(activeTeams.rows[0].count, 10);
  const submittedToday = parseInt(todayUpdates.rows[0].count, 10);

  // Submission trend for last 14 days
  const { rows: trend } = await query(
    `SELECT d.date,
            COUNT(du.id) as submitted,
            (SELECT COUNT(*) FROM teams WHERE status = 'active') - COUNT(du.id) as not_submitted,
            COUNT(du.id) FILTER (WHERE du.is_late = TRUE) as late
     FROM generate_series(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, '1 day') as d(date)
     LEFT JOIN daily_updates du ON du.update_date = d.date
     LEFT JOIN holidays h ON h.holiday_date = d.date
     WHERE h.id IS NULL
     GROUP BY d.date ORDER BY d.date`
  );

  // Project status distribution
  const { rows: projectDist } = await query(
    `SELECT status, COUNT(*) as count FROM teams GROUP BY status`
  );

  // Paper status distribution
  const { rows: paperDist } = await query(
    `SELECT status, COUNT(*) as count FROM papers GROUP BY status`
  );

  // Team progress cards (top teams needing attention)
  const { rows: teamProgress } = await query(
    `SELECT t.id, t.name, t.project_title, t.progress_percent, t.status,
            (SELECT MAX(update_date) FROM daily_updates WHERE team_id = t.id) as last_update,
            CURRENT_DATE - (SELECT MAX(update_date) FROM daily_updates WHERE team_id = t.id) as days_since_update
     FROM teams t WHERE t.status = 'active'
     ORDER BY days_since_update DESC NULLS FIRST
     LIMIT 10`
  );

  return successResponse(res, {
    cards: {
      totalTeams: parseInt(totalTeams.rows[0].count, 10),
      activeTeams: totalActiveTeams,
      completedTeams: parseInt(completedTeams.rows[0].count, 10),
      pendingReviewTeams: parseInt(pendingReviewTeams.rows[0].count, 10),
      updatesToday: submittedToday,
      notSubmittedToday: totalActiveTeams - submittedToday,
      lateToday: parseInt(lateUpdates.rows[0].count, 10),
      totalStudents: parseInt(totalStudents.rows[0].count, 10),
      totalFaculty: parseInt(totalFaculty.rows[0].count, 10),
      papersSubmitted: parseInt(papersStats.rows[0].submitted, 10),
      papersUnderReview: parseInt(papersStats.rows[0].under_review, 10),
      papersAccepted: parseInt(papersStats.rows[0].accepted, 10),
      papersPublished: parseInt(papersStats.rows[0].published, 10),
      papersTotal: parseInt(papersStats.rows[0].total, 10),
      recentFollowups: parseInt(recentFollowups.rows[0].count, 10),
    },
    charts: {
      submissionTrend: trend,
      projectDistribution: projectDist,
      paperDistribution: paperDist,
    },
    teamProgress,
  });
});

const facultyDashboard = asyncHandler(async (req, res) => {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE });

  const { rows: teams } = await query(
    `SELECT t.*, b.name as batch_name,
            lead.name as lead_name, lead.roll_number as lead_roll_number,
            (SELECT MAX(update_date) FROM daily_updates WHERE team_id = t.id) as last_update_date,
            (SELECT COUNT(*) FROM daily_updates WHERE team_id = t.id AND update_date = $2) as has_today_update,
            (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
     FROM teams t
     LEFT JOIN batches b ON t.batch_id = b.id
     LEFT JOIN users lead ON t.lead_id = lead.id
     WHERE t.guide_id = $1
     ORDER BY t.name`,
    [req.user.id, today]
  );

  // Recent updates across all guided teams
  const { rows: recentUpdates } = await query(
    `SELECT du.*, t.name as team_name, u.name as submitted_by_name
     FROM daily_updates du
     JOIN teams t ON du.team_id = t.id
     JOIN users u ON du.submitted_by = u.id
     WHERE t.guide_id = $1
     ORDER BY du.created_at DESC LIMIT 10`,
    [req.user.id]
  );

  // Weekly reviews for batches associated with faculty's teams (or all active batches if none assigned)
  const { rows: wrRows } = await query(
    `SELECT wr.*, b.name as batch_name, u.name as created_by_name
     FROM weekly_reviews wr
     LEFT JOIN batches b ON wr.batch_id = b.id
     LEFT JOIN users u ON wr.created_by = u.id
     WHERE (
       wr.batch_id IN (SELECT DISTINCT batch_id FROM teams WHERE guide_id = $1)
       OR NOT EXISTS (SELECT 1 FROM teams WHERE guide_id = $1)
     )
     ORDER BY wr.review_date DESC, wr.week_no DESC
     LIMIT 5`,
    [req.user.id]
  );

  if (wrRows.length > 0) {
    const reviewIds = wrRows.map(r => r.id);
    const { rows: allRemarks } = await query(
      `SELECT rr.*, u.name as user_name, u.role as user_role, u.roll_number as user_roll_number,
              t.name as team_name
       FROM review_remarks rr
       JOIN users u ON rr.user_id = u.id
       LEFT JOIN teams t ON rr.team_id = t.id
       WHERE rr.review_id = ANY($1::int[])
       ORDER BY rr.created_at ASC`,
      [reviewIds]
    );

    const remarksByReview = {};
    for (const rem of allRemarks) {
      if (!remarksByReview[rem.review_id]) remarksByReview[rem.review_id] = [];
      remarksByReview[rem.review_id].push(rem);
    }

    for (const r of wrRows) {
      r.remarks = remarksByReview[r.id] || [];
    }
  }

  return successResponse(res, { teams, recentUpdates, weeklyReviews: wrRows });
});

const studentDashboard = asyncHandler(async (req, res) => {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE });

  // Get student's team
  const { rows: teamRows } = await query(
    `SELECT t.*, b.name as batch_name,
            lead.name as lead_name, lead.roll_number as lead_roll_number, lead.id as lead_id,
            guide.name as guide_name, guide.roll_number as guide_roll_number
     FROM team_members tm
     JOIN teams t ON tm.team_id = t.id
     LEFT JOIN batches b ON t.batch_id = b.id
     LEFT JOIN users lead ON t.lead_id = lead.id
     LEFT JOIN users guide ON t.guide_id = guide.id
     WHERE tm.user_id = $1 LIMIT 1`,
    [req.user.id]
  );

  const team = teamRows.length > 0 ? teamRows[0] : null;
  const isLead = team ? team.lead_id === req.user.id : false;
  const studentBatchId = team ? team.batch_id : req.user.batch_id;

  // Fetch recent weekly reviews with coordinator suggestions for student's batch
  let weeklyReviews = [];
  if (studentBatchId) {
    const { rows: wrRows } = await query(
      `SELECT wr.*, b.name as batch_name, u.name as created_by_name
       FROM weekly_reviews wr
       LEFT JOIN batches b ON wr.batch_id = b.id
       LEFT JOIN users u ON wr.created_by = u.id
       WHERE wr.batch_id = $1
       ORDER BY wr.review_date DESC, wr.week_no DESC
       LIMIT 4`,
      [studentBatchId]
    );

    if (wrRows.length > 0) {
      const reviewIds = wrRows.map(r => r.id);
      const { rows: allRemarks } = await query(
        `SELECT rr.*, u.name as user_name, u.role as user_role, u.roll_number as user_roll_number,
                t.name as team_name
         FROM review_remarks rr
         JOIN users u ON rr.user_id = u.id
         LEFT JOIN teams t ON rr.team_id = t.id
         WHERE rr.review_id = ANY($1::int[])
         ORDER BY rr.created_at ASC`,
        [reviewIds]
      );

      const remarksByReview = {};
      for (const rem of allRemarks) {
        if (!remarksByReview[rem.review_id]) remarksByReview[rem.review_id] = [];
        remarksByReview[rem.review_id].push(rem);
      }

      for (const r of wrRows) {
        r.remarks = remarksByReview[r.id] || [];
      }
    }
    weeklyReviews = wrRows;
  }

  if (!team) {
    // Announcements for student batch
    const { rows: announcements } = await query(
      `SELECT * FROM announcements
       WHERE audience_type = 'all'
       OR (audience_type = 'batch' AND batch_id = $1)
       ORDER BY created_at DESC LIMIT 5`,
      [studentBatchId || 0]
    );

    return successResponse(res, {
      team: null,
      isLead: false,
      todayUpdate: null,
      recentUpdates: [],
      announcements,
      papers: [],
      weeklyReviews,
    });
  }

  // Today's update
  const { rows: todayUpdate } = await query(
    'SELECT * FROM daily_updates WHERE team_id = $1 AND update_date = $2',
    [team.id, today]
  );

  // Recent updates
  const { rows: recentUpdates } = await query(
    `SELECT du.*, u.name as submitted_by_name,
            (SELECT COUNT(*) FROM update_comments WHERE update_id = du.id) as comment_count
     FROM daily_updates du JOIN users u ON du.submitted_by = u.id
     WHERE du.team_id = $1 ORDER BY du.update_date DESC LIMIT 7`,
    [team.id]
  );

  // Recent announcements
  const { rows: announcements } = await query(
    `SELECT * FROM announcements
     WHERE audience_type = 'all'
     OR (audience_type = 'batch' AND batch_id = $1)
     OR (audience_type = 'team' AND team_id = $2)
     ORDER BY created_at DESC LIMIT 5`,
    [team.batch_id, team.id]
  );

  // Paper status
  const { rows: papers } = await query(
    'SELECT * FROM papers WHERE team_id = $1 ORDER BY updated_at DESC',
    [team.id]
  );

  return successResponse(res, {
    team,
    isLead,
    todayUpdate: todayUpdate[0] || null,
    recentUpdates,
    announcements,
    papers,
    weeklyReviews,
  });
});

module.exports = { adminDashboard, facultyDashboard, studentDashboard };
