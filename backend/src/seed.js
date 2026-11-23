require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool, testConnection, transaction } = require('./config/database');

async function seed() {
  try {
    await testConnection();
    console.log('Starting seed...');

    // Always create admin if not exists
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@college.edu';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

    const { rows: existingAdmin } = await pool.query(
      'SELECT id FROM users WHERE email = $1', [adminEmail]
    );

    if (existingAdmin.length === 0) {
      const hash = await bcrypt.hash(adminPassword, 12);
      await pool.query(
        `INSERT INTO users (name, email, phone, role, password_hash, must_change_password, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['Project Coordinator', adminEmail, '9999999999', 'admin', hash, false, true]
      );
      console.log(`  ✅ Admin created: ${adminEmail}`);
    } else {
      console.log(`  ✓ Admin already exists: ${adminEmail}`);
    }

    // Demo data only when SEED_DEMO=true
    if (process.env.SEED_DEMO === 'true') {
      console.log('\nSeeding demo data...');

      await transaction(async (client) => {
        // Check if demo data already exists
        const { rows: batches } = await client.query('SELECT id FROM batches LIMIT 1');
        if (batches.length > 0) {
          console.log('  ✓ Demo data already exists, skipping.');
          return;
        }

        // Create a batch
        const { rows: [batch] } = await client.query(
          `INSERT INTO batches (name, academic_year) VALUES ($1, $2) RETURNING id`,
          ['2027 Batch', '2026-2027']
        );
        console.log(`  ✅ Batch created: 2027 Batch (ID: ${batch.id})`);

        const demoPassword = await bcrypt.hash('Password@123', 12);

        // Create 2 faculty
        const facultyData = [
          ['Dr. Ramesh Kumar', 'ramesh@college.edu', '9876543210'],
          ['Dr. Priya Sharma', 'priya@college.edu', '9876543211'],
        ];

        const facultyIds = [];
        for (const [name, email, phone] of facultyData) {
          const { rows: [f] } = await client.query(
            `INSERT INTO users (name, email, phone, role, password_hash, must_change_password, is_active)
             VALUES ($1, $2, $3, 'faculty', $4, true, true) RETURNING id`,
            [name, email, phone, demoPassword]
          );
          facultyIds.push(f.id);
          console.log(`  ✅ Faculty: ${name} (ID: ${f.id})`);
        }

        // Create 6 students
        const studentData = [
          ['Arun Patel', 'arun@student.edu', '9000000001'],
          ['Bhavya Reddy', 'bhavya@student.edu', '9000000002'],
          ['Charan Sai', 'charan@student.edu', '9000000003'],
          ['Deepika Nair', 'deepika@student.edu', '9000000004'],
          ['Esha Gupta', 'esha@student.edu', '9000000005'],
          ['Farhan Ali', 'farhan@student.edu', '9000000006'],
        ];

        const studentIds = [];
        for (const [name, email, phone] of studentData) {
          const { rows: [s] } = await client.query(
            `INSERT INTO users (name, email, phone, role, password_hash, must_change_password, batch_id, is_active)
             VALUES ($1, $2, $3, 'student', $4, true, $5, true) RETURNING id`,
            [name, email, phone, demoPassword, batch.id]
          );
          studentIds.push(s.id);
          console.log(`  ✅ Student: ${name} (ID: ${s.id})`);
        }

        // Create 2 teams
        const teamData = [
          {
            name: 'Team Alpha',
            title: 'AI-based Attendance System',
            desc: 'Using facial recognition for automated attendance tracking in classrooms.',
            leadIdx: 0, guideIdx: 0, memberIdxs: [0, 1, 2]
          },
          {
            name: 'Team Beta',
            title: 'Smart Campus IoT Dashboard',
            desc: 'IoT sensors for monitoring classroom occupancy, temperature and energy usage.',
            leadIdx: 3, guideIdx: 1, memberIdxs: [3, 4, 5]
          }
        ];

        for (const t of teamData) {
          const { rows: [team] } = await client.query(
            `INSERT INTO teams (batch_id, name, project_title, project_description, lead_id, guide_id, status, progress_percent, start_date)
             VALUES ($1, $2, $3, $4, $5, $6, 'active', 10, CURRENT_DATE) RETURNING id`,
            [batch.id, t.name, t.title, t.desc, studentIds[t.leadIdx], facultyIds[t.guideIdx]]
          );
          console.log(`  ✅ Team: ${t.name} (ID: ${team.id})`);

          // Add members
          for (const mIdx of t.memberIdxs) {
            await client.query(
              'INSERT INTO team_members (team_id, user_id) VALUES ($1, $2)',
              [team.id, studentIds[mIdx]]
            );
          }
          console.log(`    Added ${t.memberIdxs.length} members`);
        }
      });

      console.log('\n✅ Demo data seeded successfully.');
      console.log('  Demo login credentials:');
      console.log('  Faculty: ramesh@college.edu / Password@123');
      console.log('  Faculty: priya@college.edu / Password@123');
      console.log('  Students: arun@student.edu / Password@123 (and others)');
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
