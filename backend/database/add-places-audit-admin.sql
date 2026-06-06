-- Optional manual run: psql -d my-family -f backend/database/add-places-audit-admin.sql
-- The Node server also runs the same DDL on startup (see database/ensurePlacesAuditSchema.js).

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
UPDATE users SET is_admin = TRUE WHERE username = 'nithun';

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  username VARCHAR(255),
  action VARCHAR(64) NOT NULL,
  entity_type VARCHAR(64),
  entity_id INTEGER,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS places (
  id SERIAL PRIMARY KEY,
  name VARCHAR(500) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_places_lat_lng ON places (latitude, longitude);

CREATE TABLE IF NOT EXISTS user_privacy_settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  privacy_notice_read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE family_members
  ADD COLUMN IF NOT EXISTS birth_place_id INTEGER REFERENCES places(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS residence_place_id INTEGER REFERENCES places(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS education_level VARCHAR(40),
  ADD COLUMN IF NOT EXISTS educational_qualification TEXT,
  ADD COLUMN IF NOT EXISTS marital_status VARCHAR(30),
  ADD COLUMN IF NOT EXISTS anniversary_date DATE,
  ADD COLUMN IF NOT EXISTS blood_group VARCHAR(8),
  ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(32),
  ADD COLUMN IF NOT EXISTS privacy_level VARCHAR(20),
  ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(64),
  ADD COLUMN IF NOT EXISTS biography TEXT,
  ADD COLUMN IF NOT EXISTS instagram_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS facebook_id VARCHAR(255);

UPDATE family_members fm
SET birth_place_id = p.id
FROM places p
WHERE fm.birth_place_id IS NULL
  AND fm.birth_place IS NOT NULL
  AND TRIM(fm.birth_place) <> ''
  AND LOWER(TRIM(fm.birth_place)) = LOWER(TRIM(p.name));

ALTER TABLE family_members
  DROP CONSTRAINT IF EXISTS family_members_privacy_level_check;
ALTER TABLE family_members
  ADD CONSTRAINT family_members_privacy_level_check
  CHECK (privacy_level IS NULL OR privacy_level IN ('public', 'family', 'admin_only'));

ALTER TABLE family_members
  DROP CONSTRAINT IF EXISTS family_members_marital_status_check;
ALTER TABLE family_members
  ADD CONSTRAINT family_members_marital_status_check
  CHECK (marital_status IS NULL OR marital_status IN ('single', 'married', 'widowed', 'divorced', 'separated', 'other'));

CREATE INDEX IF NOT EXISTS idx_family_members_birth_place_id ON family_members (birth_place_id);
CREATE INDEX IF NOT EXISTS idx_family_members_residence_place_id ON family_members (residence_place_id);
CREATE INDEX IF NOT EXISTS idx_family_members_created_by ON family_members (created_by);
CREATE INDEX IF NOT EXISTS idx_family_members_updated_by ON family_members (updated_by);
