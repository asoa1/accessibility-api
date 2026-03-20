const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function getDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT 'free',
      calls_today INTEGER NOT NULL DEFAULT 0,
      calls_total INTEGER NOT NULL DEFAULT 0,
      last_reset TEXT NOT NULL DEFAULT (current_date::text),
      created_at TEXT NOT NULL DEFAULT (now()::text),
      active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS scan_logs (
      id TEXT PRIMARY KEY,
      api_key_id TEXT NOT NULL,
      url TEXT NOT NULL,
      violations INTEGER,
      status TEXT,
      duration_ms INTEGER,
      created_at TEXT NOT NULL DEFAULT (now()::text)
    );
  `);
  return pool;
}

async function run(sql, params = []) {
  const pgSql = sql.replace(/\?/g, (_, i) => `$${++i}`);
  let idx = 0;
  const converted = sql.replace(/\?/g, () => `$${++idx}`);
  await pool.query(converted, params);
}

async function get(sql, params = []) {
  let idx = 0;
  const converted = sql.replace(/\?/g, () => `$${++idx}`);
  const result = await pool.query(converted, params);
  return result.rows[0] || null;
}

async function all(sql, params = []) {
  let idx = 0;
  const converted = sql.replace(/\?/g, () => `$${++idx}`);
  const result = await pool.query(converted, params);
  return result.rows;
}

module.exports = { getDb, run, get, all };
