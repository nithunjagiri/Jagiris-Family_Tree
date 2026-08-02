const db = require('./db');

/**
 * Ensures core schema exists for auth, audit, places, and shared-family scoping.
 * Safe to run on every server start (IF NOT EXISTS / IF NOT EXISTS column).
 */
async function ensurePlacesAuditSchema() {
  await db.query(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE'
  );
  await db.query("UPDATE users SET is_admin = TRUE WHERE username = 'nithun'");

  await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(120)');
  await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(120)');
  await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(32)');
  await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(64)');
  await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE');
  await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE');
  await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS city_village VARCHAR(255)');
  await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(255)');
  await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS village VARCHAR(255)');
  await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo TEXT');

  await db.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      username VARCHAR(255),
      action VARCHAR(64) NOT NULL,
      entity_type VARCHAR(64),
      entity_id INTEGER,
      summary TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
  await db.query(
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC)'
  );

  await db.query(`
    CREATE TABLE IF NOT EXISTS places (
      id SERIAL PRIMARY KEY,
      name VARCHAR(500) NOT NULL,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
  await db.query(
    'CREATE INDEX IF NOT EXISTS idx_places_lat_lng ON places (latitude, longitude)'
  );

  await db.query(`
    CREATE TABLE IF NOT EXISTS user_privacy_settings (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      privacy_notice_read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS families (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.query('CREATE INDEX IF NOT EXISTS idx_families_created_by ON families (created_by)');

  await db.query(`
    CREATE TABLE IF NOT EXISTS family_memberships (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      role VARCHAR(32) NOT NULL DEFAULT 'member',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (user_id, family_id)
    )
  `);
  await db.query('CREATE INDEX IF NOT EXISTS idx_family_memberships_family_id ON family_memberships (family_id)');

  // Plan B profile model: normalized places + richer member profile fields.
  await db.query(`
    ALTER TABLE family_members
      ADD COLUMN IF NOT EXISTS family_id INTEGER REFERENCES families(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS birth_place_id INTEGER REFERENCES places(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS residence_place_id INTEGER REFERENCES places(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS residence_place VARCHAR(500),
      ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(32),
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
      ADD COLUMN IF NOT EXISTS facebook_id VARCHAR(255)
  `);

  await db.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS family_id INTEGER REFERENCES families(id) ON DELETE CASCADE');
  await db.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS image_path TEXT');
  await db.query('ALTER TABLE events ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL');
  await db.query('ALTER TABLE photos ADD COLUMN IF NOT EXISTS family_id INTEGER REFERENCES families(id) ON DELETE CASCADE');
  await db.query('ALTER TABLE places ADD COLUMN IF NOT EXISTS family_id INTEGER REFERENCES families(id) ON DELETE CASCADE');

  // Backfill one default family membership per user if missing.
  await db.query(`
    INSERT INTO families (name, created_by)
    SELECT u.username || '''s Family', u.id
    FROM users u
    WHERE NOT EXISTS (
      SELECT 1
      FROM family_memberships fm
      WHERE fm.user_id = u.id
    )
  `);
  await db.query(`
    INSERT INTO family_memberships (user_id, family_id, role)
    SELECT f.created_by, f.id, 'owner'
    FROM families f
    WHERE f.created_by IS NOT NULL
    ON CONFLICT (user_id, family_id) DO NOTHING
  `);

  // Link legacy rows to a family. Prefer creator/owner family; fallback to first available family.
  // Cast both sides to text to tolerate created_by / updated_by stored as VARCHAR on older schemas.
  await db.query(`
    UPDATE family_members fm
    SET family_id = COALESCE(
      (SELECT fm2.family_id
       FROM family_memberships fm2
       WHERE fm2.user_id::text = fm.created_by::text
         AND fm.created_by IS NOT NULL
         AND TRIM(fm.created_by::text) <> ''
       ORDER BY fm2.family_id
       LIMIT 1),
      (SELECT fm3.family_id
       FROM family_memberships fm3
       WHERE fm3.user_id::text = fm.updated_by::text
         AND fm.updated_by IS NOT NULL
         AND TRIM(fm.updated_by::text) <> ''
       ORDER BY fm3.family_id
       LIMIT 1),
      (SELECT id FROM families ORDER BY id LIMIT 1)
    )
    WHERE fm.family_id IS NULL
  `);
  // Legacy/global dataset repair:
  // If old rows still have NULL family_id, move them to a canonical legacy family
  // (prefer user "nithun" family; otherwise smallest user id), and grant access
  // to all existing users so historical shared data remains visible.
  const legacyRows = await db.query('SELECT COUNT(*)::int AS c FROM family_members WHERE family_id IS NULL');
  if ((legacyRows.rows[0]?.c || 0) > 0) {
    const ownerUser = await db.query(
      `SELECT id
       FROM users
       ORDER BY (username = 'nithun') DESC, id ASC
       LIMIT 1`
    );
    const ownerId = ownerUser.rows[0]?.id || null;
    if (ownerId != null) {
      await db.query(
        `INSERT INTO families (name, created_by)
         SELECT u.username || '''s Family', u.id
         FROM users u
         WHERE u.id = $1
           AND NOT EXISTS (
             SELECT 1 FROM family_memberships fm WHERE fm.user_id = u.id
           )`,
        [ownerId]
      );
      const ownerFamily = await db.query(
        `SELECT fm.family_id
         FROM family_memberships fm
         WHERE fm.user_id = $1
         ORDER BY fm.family_id ASC
         LIMIT 1`,
        [ownerId]
      );
      const canonicalFamilyId = ownerFamily.rows[0]?.family_id || null;
      if (canonicalFamilyId != null) {
        await db.query(
          `UPDATE family_members
           SET family_id = $1
           WHERE family_id IS NULL`,
          [canonicalFamilyId]
        );
        await db.query(
          `UPDATE events
           SET family_id = $1
           WHERE family_id IS NULL`,
          [canonicalFamilyId]
        );
        await db.query(
          `UPDATE photos
           SET family_id = $1
           WHERE family_id IS NULL`,
          [canonicalFamilyId]
        );
        await db.query(
          `UPDATE places
           SET family_id = $1
           WHERE family_id IS NULL`,
          [canonicalFamilyId]
        );
        await db.query(
          `INSERT INTO family_memberships (user_id, family_id, role)
           SELECT u.id, $1, CASE WHEN u.id = $2 THEN 'owner' ELSE 'member' END
           FROM users u
           ON CONFLICT (user_id, family_id) DO NOTHING`,
          [canonicalFamilyId, ownerId]
        );
      }
    }
  }
  await db.query(`
    UPDATE events e
    SET family_id = COALESCE(
      (SELECT fm.family_id
       FROM family_members fm
       ORDER BY fm.id
       LIMIT 1),
      (SELECT id FROM families ORDER BY id LIMIT 1)
    )
    WHERE e.family_id IS NULL
  `);
  await db.query(`
    UPDATE photos p
    SET family_id = COALESCE(
      (SELECT fm.family_id
       FROM family_members fm
       ORDER BY fm.id
       LIMIT 1),
      (SELECT id FROM families ORDER BY id LIMIT 1)
    )
    WHERE p.family_id IS NULL
  `);
  await db.query(`
    UPDATE places p
    SET family_id = COALESCE(
      (SELECT fm.family_id
       FROM family_members fm
       WHERE fm.birth_place_id::text = p.id::text OR fm.residence_place_id::text = p.id::text
       ORDER BY fm.id
       LIMIT 1),
      (SELECT id FROM families ORDER BY id LIMIT 1)
    )
    WHERE p.family_id IS NULL
  `);

  await db.query('CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON family_members (family_id)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_events_family_id ON events (family_id)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_events_created_by ON events (created_by)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_photos_family_id ON photos (family_id)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_places_family_id ON places (family_id)');

  await db.query(`
    UPDATE family_members fm
    SET birth_place_id = p.id
    FROM places p
    WHERE fm.birth_place_id IS NULL
      AND fm.birth_place IS NOT NULL
      AND TRIM(fm.birth_place) <> ''
      AND LOWER(TRIM(fm.birth_place)) = LOWER(TRIM(p.name))
  `);

  await db.query('ALTER TABLE family_members DROP CONSTRAINT IF EXISTS family_members_privacy_level_check');
  await db.query(`
    ALTER TABLE family_members
      ADD CONSTRAINT family_members_privacy_level_check
      CHECK (
        privacy_level IS NULL OR
        privacy_level IN ('public', 'family', 'admin_only')
      )
  `);

  await db.query('ALTER TABLE family_members DROP CONSTRAINT IF EXISTS family_members_marital_status_check');
  await db.query(`
    ALTER TABLE family_members
      ADD CONSTRAINT family_members_marital_status_check
      CHECK (
        marital_status IS NULL OR
        marital_status IN ('single', 'married', 'widowed', 'divorced', 'separated', 'other')
      )
  `);
  await db.query('CREATE INDEX IF NOT EXISTS idx_family_members_birth_place_id ON family_members (birth_place_id)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_family_members_residence_place_id ON family_members (residence_place_id)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_family_members_created_by ON family_members (created_by)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_family_members_updated_by ON family_members (updated_by)');

  // ── Push notification infrastructure ──

  await db.query(`
    CREATE TABLE IF NOT EXISTS push_notification_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL,
      platform VARCHAR(16) NOT NULL DEFAULT 'android',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (user_id, token)
    )
  `);
  await db.query('CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_notification_tokens (user_id)');

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
  await db.query('CREATE INDEX IF NOT EXISTS idx_announcements_family_id ON announcements (family_id)');
  await db.query(
    "ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_audience VARCHAR(16) NOT NULL DEFAULT 'all'"
  );

  await db.query(`
    CREATE TABLE IF NOT EXISTS notification_deliveries (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      notification_type VARCHAR(64) NOT NULL,
      reference_key VARCHAR(255) NOT NULL,
      delivered_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (user_id, notification_type, reference_key)
    )
  `);
  await db.query('CREATE INDEX IF NOT EXISTS idx_notif_deliveries_lookup ON notification_deliveries (user_id, notification_type, reference_key)');

  // ── Gallery album batches ──

  await db.query('ALTER TABLE photos ADD COLUMN IF NOT EXISTS upload_batch_id UUID');
  await db.query(
    'CREATE INDEX IF NOT EXISTS idx_photos_upload_batch_id ON photos (upload_batch_id)'
  );

  // ── In-app notification feed (header bell) ──

  await db.query(`
    CREATE TABLE IF NOT EXISTS user_notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      type VARCHAR(32) NOT NULL,
      title VARCHAR(500) NOT NULL,
      body TEXT,
      entity_type VARCHAR(64),
      entity_id INTEGER,
      link_path VARCHAR(255),
      actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      reference_key VARCHAR(255),
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.query(
    'CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread ON user_notifications (user_id, read_at, created_at DESC)'
  );
  await db.query(
    'CREATE INDEX IF NOT EXISTS idx_user_notifications_family ON user_notifications (family_id, created_at DESC)'
  );
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_notifications_dedup
    ON user_notifications (user_id, type, reference_key)
    WHERE reference_key IS NOT NULL
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS user_feed_dismissals (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      reference_key VARCHAR(255) NOT NULL,
      dismissed_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (user_id, family_id, reference_key)
    )
  `);
}

module.exports = { ensurePlacesAuditSchema };
