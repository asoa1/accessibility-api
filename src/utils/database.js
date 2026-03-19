const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || './data/api.db';

// Make sure the data folder exists
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS api_keys (
    id         TEXT PRIMARY KEY,
    key        TEXT UNIQUE NOT NULL,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL,
    plan       TEXT NOT NULL DEFAULT 'free',
    calls_today    INTEGER NOT NULL DEFAULT 0,
    calls_total    INTEGER NOT NULL DEFAULT 0,
    last_reset     TEXT NOT NULL DEFAULT (date('now')),
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    active     INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS scan_logs (
    id         TEXT PRIMARY KEY,
    api_key_id TEXT NOT NULL,
    url        TEXT NOT NULL,
    violations INTEGER,
    status     TEXT,
    duration_ms INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(api_key_id) REFERENCES api_keys(id)
  );
`);

module.exports = db;
