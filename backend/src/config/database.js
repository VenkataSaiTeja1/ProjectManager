require('dotenv').config();
const { Pool } = require('pg');

let connectionString = process.env.DATABASE_URL || '';

// If connectionString has sslmode parameter, remove it so our explicit ssl configuration takes precedence
if (connectionString.includes('sslmode=')) {
  connectionString = connectionString.replace(/([?&])sslmode=[^&]+(&|$)/, (match, p1, p2) => {
    return p2 === '&' ? p1 : '';
  }).replace(/\?$/, '');
}

const sslConfig = process.env.PG_CA_CERT
  ? { rejectUnauthorized: true, ca: process.env.PG_CA_CERT }
  : { rejectUnauthorized: false };

const pool = new Pool({
  connectionString,
  ssl: sslConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

// Retry logic for Aiven cold starts
let retries = 0;
const MAX_RETRIES = 5;

pool.on('error', (err) => {
  console.error('Unexpected pool error:', err.message);
  if (retries < MAX_RETRIES) {
    retries++;
    console.log(`Retrying connection (${retries}/${MAX_RETRIES})...`);
  }
});

const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('Query:', { text: text.substring(0, 80), duration, rows: res.rowCount });
    }
    return res;
  } catch (err) {
    console.error('Query error:', { text: text.substring(0, 80), error: err.message });
    throw err;
  }
};

const getClient = async () => {
  const client = await pool.connect();
  return client;
};

const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const testConnection = async () => {
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const res = await pool.query('SELECT NOW()');
      console.log('Database connected at:', res.rows[0].now);
      return true;
    } catch (err) {
      console.error(`DB connection attempt ${i + 1}/${MAX_RETRIES} failed:`, err.message);
      if (i < MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
      }
    }
  }
  throw new Error('Could not connect to database after retries');
};

module.exports = { pool, query, getClient, transaction, testConnection };
