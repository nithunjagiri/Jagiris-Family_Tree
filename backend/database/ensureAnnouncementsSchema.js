const db = require('./db');

/**
 * Ensures announcements table exists. Called at startup and lazily on first API use
 * so production DBs still work if the main schema ensure failed partway through.
 */
async function ensureAnnouncementsSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS announcements (
      id SERIAL PRIMARY KEY,
      family_id INTEGER REFERENCES families(id) ON DELETE CASCADE,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      title VARCHAR(500) NOT NULL,
      body TEXT,
      target_audience VARCHAR(16) NOT NULL DEFAULT 'all',
      sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.query(
    'CREATE INDEX IF NOT EXISTS idx_announcements_family_id ON announcements (family_id)'
  );
  await db.query(
    "ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_audience VARCHAR(16) DEFAULT 'all'"
  );
  await db.query(
    "UPDATE announcements SET target_audience = 'all' WHERE target_audience IS NULL"
  );
}

module.exports = { ensureAnnouncementsSchema };
