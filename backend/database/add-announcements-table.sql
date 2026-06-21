-- Run once on Supabase/PostgreSQL if announcements table is missing:
-- psql "$DATABASE_URL" -f backend/database/add-announcements-table.sql

CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  family_id INTEGER REFERENCES families(id) ON DELETE CASCADE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(500) NOT NULL,
  body TEXT,
  target_audience VARCHAR(16) NOT NULL DEFAULT 'all',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_family_id ON announcements (family_id);

ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_audience VARCHAR(16) DEFAULT 'all';
UPDATE announcements SET target_audience = 'all' WHERE target_audience IS NULL;
