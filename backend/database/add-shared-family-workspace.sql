-- Shared family workspace schema migration.
-- Usage: psql -d my_family -f backend/database/add-shared-family-workspace.sql

CREATE TABLE IF NOT EXISTS families (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS family_memberships (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  role VARCHAR(32) NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, family_id)
);

CREATE INDEX IF NOT EXISTS idx_families_created_by ON families (created_by);
CREATE INDEX IF NOT EXISTS idx_family_memberships_family_id ON family_memberships (family_id);

ALTER TABLE family_members
  ADD COLUMN IF NOT EXISTS family_id INTEGER REFERENCES families(id) ON DELETE CASCADE;
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS family_id INTEGER REFERENCES families(id) ON DELETE CASCADE;
ALTER TABLE photos
  ADD COLUMN IF NOT EXISTS family_id INTEGER REFERENCES families(id) ON DELETE CASCADE;
ALTER TABLE places
  ADD COLUMN IF NOT EXISTS family_id INTEGER REFERENCES families(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON family_members (family_id);
CREATE INDEX IF NOT EXISTS idx_events_family_id ON events (family_id);
CREATE INDEX IF NOT EXISTS idx_photos_family_id ON photos (family_id);
CREATE INDEX IF NOT EXISTS idx_places_family_id ON places (family_id);
