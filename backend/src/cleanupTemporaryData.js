require('dotenv').config();
const { pool, testConnection, transaction } = require('./config/database');
const bcrypt = require('bcryptjs');

async function cleanData() {
  try {
    await testConnection();
    console.log('Cleaning temporary data from Aiven database...');

    await transaction(async (client) => {
      // 1. Delete dependent child records
      await client.query('DELETE FROM daily_update_history');
      await client.query('DELETE FROM update_comments');
      await client.query('DELETE FROM daily_updates');
      await client.query('DELETE FROM review_acks');
      await client.query('DELETE FROM review_remarks');
      await client.query('DELETE FROM weekly_reviews');
      await client.query('DELETE FROM announcements');
      await client.query('DELETE FROM papers');
      await client.query('DELETE FROM followups');
      await client.query('DELETE FROM notifications');
      await client.query('DELETE FROM team_members');
      await client.query('DELETE FROM teams');

      // 2. Delete demo users (keep only admin)
      await client.query("DELETE FROM users WHERE role != 'admin'");

      // 3. Ensure admin user exists with roll_number 'admin' and clean password
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@college.edu';
      const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
      const hash = await bcrypt.hash(adminPassword, 12);

      const { rows: adminRows } = await client.query(
        "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
      );

      if (adminRows.length > 0) {
        await client.query(
          `UPDATE users SET name = 'Project Coordinator', email = $1, roll_number = 'admin',
           password_hash = $2, must_change_password = FALSE, is_active = TRUE
           WHERE id = $3`,
          [adminEmail, hash, adminRows[0].id]
        );
        console.log(`  ✓ Updated Admin user (Roll Number: admin, Email: ${adminEmail})`);
      } else {
        await client.query(
          `INSERT INTO users (name, email, roll_number, role, password_hash, must_change_password, is_active)
           VALUES ('Project Coordinator', $1, 'admin', 'admin', $2, FALSE, TRUE)`,
          [adminEmail, hash]
        );
        console.log(`  ✓ Created Admin user (Roll Number: admin, Email: ${adminEmail})`);
      }
    });

    console.log('✅ Temporary data cleaned successfully. Only Admin exists.');
  } catch (err) {
    console.error('Cleanup failed:', err.message);
  } finally {
    await pool.end();
  }
}

cleanData();
