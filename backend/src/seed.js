require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool, testConnection, transaction } = require('./config/database');

async function seed() {
  try {
    await testConnection();
    console.log('Starting seed...');

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@college.edu';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

    const { rows: existingAdmin } = await pool.query(
      "SELECT id FROM users WHERE role = 'admin' OR roll_number = 'admin' OR email = $1",
      [adminEmail]
    );

    if (existingAdmin.length === 0) {
      const hash = await bcrypt.hash(adminPassword, 12);
      await pool.query(
        `INSERT INTO users (name, email, roll_number, phone, role, password_hash, must_change_password, is_active)
         VALUES ($1, $2, 'admin', '9999999999', 'admin', $3, false, true)`,
        ['Project Coordinator', adminEmail, hash]
      );
      console.log(`  ✅ Admin created: Roll Number 'admin' / Email '${adminEmail}'`);
    } else {
      await pool.query(
        "UPDATE users SET roll_number = 'admin', must_change_password = FALSE WHERE id = $1",
        [existingAdmin[0].id]
      );
      console.log(`  ✓ Admin verified: ID ${existingAdmin[0].id}`);
    }

    console.log('\nSeed complete.');
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
