const { query } = require('../config/database');

const TIMEZONE = process.env.TIMEZONE || 'Asia/Kolkata';

const sendEmail = async ({ to, subject, html, text }) => {
  if (process.env.EMAIL_ENABLED !== 'true') {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Email Mock] To: ${to} | Subject: ${subject}`);
    }
    return { success: true, mocked: true };
  }

  // Example integration with Resend / Brevo API if key is set
  const apiKey = process.env.EMAIL_API_KEY;
  const from = process.env.EMAIL_FROM || 'noreply@college.edu';

  if (!apiKey) {
    console.warn('[EmailService] EMAIL_ENABLED is true but EMAIL_API_KEY is missing.');
    return { success: false, error: 'Missing API Key' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html: html || `<p>${text}</p>`,
        text,
      }),
    });
    const data = await res.json();
    return { success: res.ok, data };
  } catch (err) {
    console.error('[EmailService] Failed to send email:', err.message);
    return { success: false, error: err.message };
  }
};

const sendMissingUpdateReminders = async () => {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE });

  // Check if today is a holiday
  const { rows: holidays } = await query('SELECT reason FROM holidays WHERE holiday_date = $1', [today]);
  if (holidays.length > 0) {
    return { skipped: true, reason: `Today is a holiday: ${holidays[0].reason}` };
  }

  // Find active teams that haven't submitted today's update
  const { rows: missingTeams } = await query(
    `SELECT t.id, t.name as team_name,
            u.id as lead_id, u.name as lead_name, u.email as lead_email
     FROM teams t
     JOIN users u ON t.lead_id = u.id
     LEFT JOIN daily_updates du ON t.id = du.team_id AND du.update_date = $1
     WHERE t.status = 'active' AND du.id IS NULL`,
    [today]
  );

  const results = [];
  for (const team of missingTeams) {
    // In-app notification
    await query(
      `INSERT INTO notifications (user_id, type, title, message, entity, entity_id)
       VALUES ($1, 'reminder', 'Daily Update Reminder', 'Reminder: Please submit today project status update before cutoff.', 'daily_updates', $2)`,
      [team.lead_id, team.id]
    );

    // Email reminder
    const subject = `Reminder: Daily Project Update Pending for ${team.team_name}`;
    const html = `
      <h3>Hello ${team.lead_name},</h3>
      <p>This is a reminder to submit your team's (<strong>${team.team_name}</strong>) daily project status update for today (${today}).</p>
      <p>Please log in to the Project Monitoring Portal to record what was done today, tomorrow's plan, and any blockers.</p>
      <br/>
      <p>Best regards,<br/>Project Coordination Office</p>
    `;

    const emailRes = await sendEmail({
      to: team.lead_email,
      subject,
      html,
      text: `Reminder to submit daily project update for ${team.team_name} today.`,
    });

    results.push({ team: team.team_name, lead: team.lead_name, emailSent: emailRes.success });
  }

  return { totalReminders: missingTeams.length, details: results };
};

module.exports = { sendEmail, sendMissingUpdateReminders };
