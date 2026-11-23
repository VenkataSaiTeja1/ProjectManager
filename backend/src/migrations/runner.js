require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool, testConnection } = require('../config/database');

async function runMigrations() {
  try {
    await testConnection();

    // Ensure migrations tracking table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Get already applied migrations
    const { rows: applied } = await pool.query('SELECT name FROM _migrations ORDER BY id');
    const appliedNames = new Set(applied.map(r => r.name));

    // Read migration files
    const migrationsDir = path.join(__dirname);
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    let count = 0;
    for (const file of files) {
      if (appliedNames.has(file)) {
        console.log(`  ✓ ${file} (already applied)`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`  ✅ ${file} applied`);
        count++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  ❌ ${file} failed:`, err.message);
        throw err;
      } finally {
        client.release();
      }
    }

    console.log(`\nMigrations complete. ${count} new migration(s) applied.`);
  } catch (err) {
    console.error('Migration runner failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
