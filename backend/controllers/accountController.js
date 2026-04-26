const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const { body, validationResult } = require('express-validator');
const { logAudit } = require('../lib/auditLog');
const { ensurePlacesAuditSchema } = require('../database/ensurePlacesAuditSchema');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_EXPIRY = '7d';
const GENDER_VALUES = ['female', 'male', 'non_binary', 'other', 'prefer_not_to_say'];

const USER_PROFILE_SELECTS = [
  'id, username, email, first_name, last_name, phone, gender, date_of_birth, city, village, city_village',
  'id, username, email, first_name, last_name, phone, gender, date_of_birth, city, village',
  'id, username, email, first_name, last_name, phone, gender, date_of_birth',
  'id, username, email',
];

async function selectUserProfileForAccount(userId) {
  let lastErr;
  for (const cols of USER_PROFILE_SELECTS) {
    try {
      const u = await db.query(`SELECT ${cols} FROM users WHERE id = $1`, [userId]);
      const row = u.rows[0];
      if (!row) return u;
      row.city = row.city ?? null;
      row.village = row.village ?? null;
      row.city_village = row.city_village ?? null;
      row.first_name = row.first_name ?? null;
      row.last_name = row.last_name ?? null;
      row.phone = row.phone ?? null;
      row.gender = row.gender ?? null;
      row.date_of_birth = row.date_of_birth ?? null;
      return u;
    } catch (e) {
      lastErr = e;
      if (e.code !== '42703') throw e;
    }
  }
  throw lastErr;
}

async function selectPrivacySettings(userId) {
  const r = await db.query(
    'SELECT privacy_notice_read_at, created_at, updated_at FROM user_privacy_settings WHERE user_id = $1',
    [userId]
  );
  return r.rows[0] || null;
}

async function loadPrivacyWithEnsure(userId) {
  try {
    return await selectPrivacySettings(userId);
  } catch (e) {
    if (e.code === '42P01') {
      await ensurePlacesAuditSchema();
      return await selectPrivacySettings(userId);
    }
    throw e;
  }
}

exports.validateChangePassword = [
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password at least 6 characters'),
];

exports.changePassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { currentPassword, newPassword } = req.body;
    const r = await db.query('SELECT id, password FROM users WHERE id = $1', [req.user.id]);
    const user = r.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!(await bcrypt.compare(String(currentPassword), user.password))) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    const hashed = await bcrypt.hash(String(newPassword), 10);
    await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, req.user.id]);
    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: 'account.password_change',
      entityType: 'user',
      entityId: req.user.id,
      summary: 'Password changed',
    });
    res.json({ ok: true, message: 'Password updated' });
  } catch (err) {
    next(err);
  }
};

exports.exportData = async (req, res, next) => {
  try {
    const familyId = req.familyId;
    const [members, events, photos] = await Promise.all([
      db.query(
        'SELECT id, family_id, name, surname, relation, gender, date_of_birth, date_of_death, is_alive, phone, whatsapp_number, email, birth_place, birth_place_id, residence_place_id, residence_place, created_by, updated_by, occupation, notes, education_level, educational_qualification, marital_status, anniversary_date, blood_group, emergency_contact_name, emergency_contact_phone, privacy_level, preferred_language, biography, instagram_id, facebook_id, father_id, mother_id, spouse_id, created_at, updated_at FROM family_members WHERE family_id = $1 ORDER BY id',
        [familyId]
      ),
      db.query('SELECT id, family_id, title, event_date, description FROM events WHERE family_id = $1 ORDER BY event_date', [familyId]),
      db.query('SELECT id, family_id, title, image_path, uploaded_at FROM photos WHERE family_id = $1 ORDER BY uploaded_at DESC', [familyId]),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      user: { id: req.user.id, username: req.user.username },
      family: { id: familyId, name: req.familyName || null },
      familyMembers: members.rows,
      events: events.rows,
      photos: photos.rows,
    };

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="jagiris-family-export-${Date.now()}.json"`);
    res.send(JSON.stringify(payload, null, 2));
  } catch (err) {
    next(err);
  }
};

exports.listFamilies = async (req, res, next) => {
  try {
    res.json({
      activeFamilyId: req.familyId,
      families: req.familyMemberships || [],
    });
  } catch (err) {
    next(err);
  }
};

exports.getPrivacySettings = async (req, res, next) => {
  try {
    const privacy = await loadPrivacyWithEnsure(req.user.id);
    const u = await selectUserProfileForAccount(req.user.id);
    if (!u.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({
      user: u.rows[0],
      privacy: privacy || { privacy_notice_read_at: null, created_at: null, updated_at: null },
    });
  } catch (err) {
    next(err);
  }
};

exports.validateProfilePatch = [
  body('username').trim().isLength({ min: 2 }).withMessage('Username at least 2 characters'),
  body('email').isEmail().withMessage('Valid email required'),
  body('first_name').optional().trim().isLength({ max: 120 }).withMessage('First name too long'),
  body('last_name').optional().trim().isLength({ max: 120 }).withMessage('Last name too long'),
  body('phone').optional().trim().isLength({ max: 64 }).withMessage('Phone too long'),
  body('gender')
    .optional({ checkFalsy: true })
    .isIn(GENDER_VALUES)
    .withMessage('Invalid gender'),
  body('date_of_birth')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Invalid date of birth'),
  body('city').optional().trim().isLength({ max: 255 }).withMessage('City too long'),
  body('village').optional().trim().isLength({ max: 255 }).withMessage('Village too long'),
];

exports.patchProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, email } = req.body;
    const firstRaw = req.body.first_name != null ? String(req.body.first_name).trim() : '';
    const lastRaw = req.body.last_name != null ? String(req.body.last_name).trim() : '';
    const firstName = firstRaw === '' ? null : firstRaw;
    const lastName = lastRaw === '' ? null : lastRaw;
    const phoneRaw = req.body.phone != null ? String(req.body.phone).trim() : '';
    const phone = phoneRaw === '' ? null : phoneRaw;
    const genderVal = req.body.gender && String(req.body.gender).trim() ? String(req.body.gender).trim() : null;
    const dobRaw = req.body.date_of_birth != null ? String(req.body.date_of_birth).trim() : '';
    const dobVal = dobRaw === '' ? null : dobRaw.slice(0, 10);
    const cityRaw = req.body.city != null ? String(req.body.city).trim() : '';
    const villageRaw = req.body.village != null ? String(req.body.village).trim() : '';
    const city = cityRaw === '' ? null : cityRaw;
    const village = villageRaw === '' ? null : villageRaw;

    const dupUser = await db.query(
      'SELECT id FROM users WHERE LOWER(TRIM(username)) = LOWER(TRIM($1)) AND id <> $2',
      [username, req.user.id]
    );
    if (dupUser.rows[0]) return res.status(400).json({ error: 'That username is already taken' });

    const dupEmail = await db.query(
      'SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) AND id <> $2',
      [email, req.user.id]
    );
    if (dupEmail.rows[0]) return res.status(400).json({ error: 'That email is already in use' });

    try {
      await db.query(
        `UPDATE users SET username = $1, email = $2, first_name = $3, last_name = $4, phone = $5, gender = $6, date_of_birth = $7,
                city = $8, village = $9
         WHERE id = $10`,
        [username, email, firstName, lastName, phone, genderVal, dobVal, city, village, req.user.id]
      );
    } catch (e) {
      if (e.code === '42703') {
        try {
          await db.query(
            `UPDATE users SET username = $1, email = $2, first_name = $3, last_name = $4, phone = $5, gender = $6, date_of_birth = $7
             WHERE id = $8`,
            [username, email, firstName, lastName, phone, genderVal, dobVal, req.user.id]
          );
        } catch (e2) {
          if (e2.code === '42703') {
            await db.query('UPDATE users SET username = $1, email = $2 WHERE id = $3', [username, email, req.user.id]);
          } else if (e2.code === '23505') {
            return res.status(400).json({ error: 'Username or email already exists' });
          } else throw e2;
        }
      } else if (e.code === '23505') {
        return res.status(400).json({ error: 'Username or email already exists' });
      } else throw e;
    }

    let row;
    try {
      row = await db.query(
        `SELECT id, username, email, COALESCE(is_admin, false) AS is_admin, first_name, last_name, phone, gender, date_of_birth, city, village, city_village
         FROM users WHERE id = $1`,
        [req.user.id]
      );
    } catch (e) {
      if (e.code === '42703') {
        try {
          row = await db.query(
            `SELECT id, username, email, COALESCE(is_admin, false) AS is_admin, first_name, last_name, phone, gender, date_of_birth, city, village
             FROM users WHERE id = $1`,
            [req.user.id]
          );
          if (row.rows[0]) row.rows[0].city_village = null;
        } catch (e2) {
          if (e2.code === '42703') {
            try {
              row = await db.query(
                `SELECT id, username, email, COALESCE(is_admin, false) AS is_admin, first_name, last_name, phone, gender, date_of_birth
                 FROM users WHERE id = $1`,
                [req.user.id]
              );
              if (row.rows[0]) {
                row.rows[0].city = null;
                row.rows[0].village = null;
                row.rows[0].city_village = null;
              }
            } catch (e3) {
              if (e3.code === '42703') {
                try {
                  row = await db.query(
                    'SELECT id, username, email, COALESCE(is_admin, false) AS is_admin FROM users WHERE id = $1',
                    [req.user.id]
                  );
                } catch (e4) {
                  if (e4.code === '42703') {
                    row = await db.query('SELECT id, username, email FROM users WHERE id = $1', [req.user.id]);
                    row.rows[0].is_admin = false;
                  } else throw e4;
                }
              } else throw e3;
            }
          } else throw e2;
        }
      } else throw e;
    }

    const u = row.rows[0];
    const isAdmin = u.is_admin === true || u.username === 'nithun';
    const token = jwt.sign({ id: u.id, username: u.username, isAdmin }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

    await logAudit({
      userId: req.user.id,
      username: u.username,
      action: 'account.profile_update',
      entityType: 'user',
      entityId: u.id,
      summary: 'Profile updated',
    });

    res.json({
      token,
      user: { id: u.id, username: u.username, email: u.email, isAdmin },
    });
  } catch (err) {
    next(err);
  }
};

exports.validatePrivacyPatch = [
  body('acknowledgePrivacyNotice').optional().isBoolean(),
];

exports.patchPrivacySettings = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    if (req.body.acknowledgePrivacyNotice !== true) {
      return res.status(400).json({ error: 'Send { "acknowledgePrivacyNotice": true } to record that you read the in-app privacy notice.' });
    }

    const upsert = () =>
      db.query(
        `INSERT INTO user_privacy_settings (user_id, privacy_notice_read_at, updated_at)
         VALUES ($1, NOW(), NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           privacy_notice_read_at = NOW(),
           updated_at = NOW()`,
        [req.user.id]
      );

    try {
      await upsert();
    } catch (e) {
      if (e.code === '42P01') {
        await ensurePlacesAuditSchema();
        await upsert();
      } else throw e;
    }

    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: 'account.privacy_ack',
      entityType: 'user',
      entityId: req.user.id,
      summary: 'Privacy notice acknowledged',
    });

    const privacy = await selectPrivacySettings(req.user.id);
    res.json({ ok: true, privacy });
  } catch (err) {
    next(err);
  }
};

exports.validateDeleteAccount = [
  body('password').notEmpty().withMessage('Password required to confirm account deletion'),
];

exports.deleteAccount = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { password } = req.body;
    const r = await db.query(
      'SELECT id, password, COALESCE(is_admin, false) AS is_admin FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = r.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!(await bcrypt.compare(String(password), user.password))) {
      return res.status(401).json({ error: 'Password is incorrect' });
    }

    const adminCount = await db.query(
      'SELECT COUNT(*)::int AS c FROM users WHERE COALESCE(is_admin, false) = true'
    );
    const isAdmin = user.is_admin === true;
    if (isAdmin && adminCount.rows[0].c <= 1) {
      return res.status(400).json({ error: 'Cannot delete the only administrator account.' });
    }

    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: 'account.delete',
      entityType: 'user',
      entityId: req.user.id,
      summary: 'Account deleted by user',
    });
    await db.query('DELETE FROM users WHERE id = $1', [req.user.id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
