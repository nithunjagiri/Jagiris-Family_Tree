const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { logAudit } = require('../lib/auditLog');
const { ensureUserHasDefaultFamily } = require('../lib/familyAccess');

const GENDER_VALUES = ['female', 'male', 'non_binary', 'other', 'prefer_not_to_say'];

function parseUserId(req) {
  const id = parseInt(req.params.id, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function countActiveAdmins() {
  try {
    const r = await db.query(
      `SELECT COUNT(*)::int AS c FROM users
       WHERE COALESCE(is_admin, false) = true AND COALESCE(is_active, true) = true`
    );
    return r.rows[0]?.c ?? 0;
  } catch (e) {
    if (e.code === '42703') {
      const r = await db.query('SELECT COUNT(*)::int AS c FROM users WHERE COALESCE(is_admin, false) = true');
      return r.rows[0]?.c ?? 0;
    }
    throw e;
  }
}

/**
 * @param {'full'|'split'|'profile'|'minimal'} locationMode — how location columns participate in SELECT + search.
 */
function buildAdminUserListFilters(q, role, status, locationMode) {
  const params = [];
  const where = ['1=1'];
  let i = 1;
  if (q) {
    const parts = [
      `username ILIKE $${i}`,
      `email ILIKE $${i}`,
      `COALESCE(first_name::text, '') ILIKE $${i}`,
      `COALESCE(last_name::text, '') ILIKE $${i}`,
    ];
    if (locationMode === 'full') {
      parts.push(`COALESCE(city_village::text, '') ILIKE $${i}`);
      parts.push(`COALESCE(city::text, '') ILIKE $${i}`);
      parts.push(`COALESCE(village::text, '') ILIKE $${i}`);
    } else if (locationMode === 'split') {
      parts.push(`COALESCE(city::text, '') ILIKE $${i}`);
      parts.push(`COALESCE(village::text, '') ILIKE $${i}`);
    }
    where.push(`(${parts.join(' OR ')})`);
    params.push(`%${q}%`);
    i++;
  }
  if (role === 'admin') {
    where.push('COALESCE(is_admin, false) = true');
  } else if (role === 'member') {
    where.push('COALESCE(is_admin, false) = false');
  }
  if (status === 'active') {
    where.push('COALESCE(is_active, true) = true');
  } else if (status === 'inactive') {
    where.push('COALESCE(is_active, true) = false');
  }
  return { whereSql: where.join(' AND '), params };
}

async function queryAdminUserListPage(limit, offset, q, role, status, locationMode) {
  const { whereSql, params } = buildAdminUserListFilters(q, role, status, locationMode);
  const limIdx = params.length + 1;
  const offIdx = params.length + 2;
  const listParams = [...params, limit, offset];
  let selectCols;
  if (locationMode === 'full') {
    selectCols = `id, username, email,
                first_name, last_name, phone, gender, date_of_birth, city_village, city, village,
                COALESCE(is_admin, false) AS is_admin,
                COALESCE(is_active, true) AS is_active,
                created_at`;
  } else if (locationMode === 'split') {
    selectCols = `id, username, email,
                first_name, last_name, phone, gender, date_of_birth, city, village,
                COALESCE(is_admin, false) AS is_admin,
                COALESCE(is_active, true) AS is_active,
                created_at`;
  } else if (locationMode === 'profile') {
    selectCols = `id, username, email,
                first_name, last_name, phone, gender, date_of_birth,
                COALESCE(is_admin, false) AS is_admin,
                COALESCE(is_active, true) AS is_active,
                created_at`;
  } else {
    selectCols = `id, username, email,
                COALESCE(is_admin, false) AS is_admin,
                COALESCE(is_active, true) AS is_active,
                created_at`;
  }
  const items = await db.query(
    `SELECT ${selectCols}
         FROM users WHERE ${whereSql} ORDER BY id ASC LIMIT $${limIdx} OFFSET $${offIdx}`,
    listParams
  );
  if (locationMode === 'split') {
    items.rows.forEach((row) => {
      const c = row.city != null ? String(row.city).trim() : '';
      const v = row.village != null ? String(row.village).trim() : '';
      row.city_village = [c, v].filter(Boolean).join(' · ') || null;
    });
  } else if (locationMode === 'profile') {
    items.rows.forEach((row) => {
      row.city_village = null;
      row.city = null;
      row.village = null;
    });
  } else if (locationMode === 'minimal') {
    items.rows.forEach((row) => {
      row.first_name = null;
      row.last_name = null;
      row.phone = null;
      row.gender = null;
      row.date_of_birth = null;
      row.city_village = null;
      row.city = null;
      row.village = null;
    });
  }
  const countRow = await db.query(`SELECT COUNT(*)::bigint AS c FROM users WHERE ${whereSql}`, params);
  return { items, countRow };
}

exports.validateCreateUser = [
  body('username').trim().isLength({ min: 2 }).withMessage('Username at least 2 characters'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password at least 6 characters'),
  body('confirm_password')
    .notEmpty()
    .withMessage('Confirm password required')
    .custom((v, { req }) => v === req.body.password)
    .withMessage('Passwords do not match'),
  body('is_admin').optional().isBoolean(),
  body('first_name').optional().trim().isLength({ max: 120 }),
  body('last_name').optional().trim().isLength({ max: 120 }),
  body('city_village').optional().trim().isLength({ max: 255 }),
  body('city').optional().trim().isLength({ max: 255 }),
  body('village').optional().trim().isLength({ max: 255 }),
];

exports.createUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, email, password, is_admin } = req.body;
    const firstName = req.body.first_name != null ? String(req.body.first_name).trim() : '';
    const lastName = req.body.last_name != null ? String(req.body.last_name).trim() : '';
    const fn = firstName === '' ? null : firstName;
    const ln = lastName === '' ? null : lastName;
    const cvRaw = req.body.city_village != null ? String(req.body.city_village).trim() : '';
    const cityVillage = cvRaw === '' ? null : cvRaw;
    const cityRaw = req.body.city != null ? String(req.body.city).trim() : '';
    const villageRaw = req.body.village != null ? String(req.body.village).trim() : '';
    const city = cityRaw === '' ? null : cityRaw;
    const village = villageRaw === '' ? null : villageRaw;
    const adminFlag = is_admin === true || is_admin === 'true';
    const hashed = await bcrypt.hash(String(password), 10);

    let result;
    try {
      result = await db.query(
        `INSERT INTO users (username, email, password, is_admin, is_active, first_name, last_name, city_village, city, village)
         VALUES ($1, $2, $3, $4, true, $5, $6, $7, $8, $9)
         RETURNING id, username, email, created_at, COALESCE(is_admin, false) AS is_admin, COALESCE(is_active, true) AS is_active`,
        [username, email, hashed, adminFlag, fn, ln, cityVillage, city, village]
      );
    } catch (e) {
      if (e.code === '42703') {
        try {
          result = await db.query(
            `INSERT INTO users (username, email, password, is_admin, is_active, first_name, last_name, city_village)
             VALUES ($1, $2, $3, $4, true, $5, $6, $7)
             RETURNING id, username, email, created_at, COALESCE(is_admin, false) AS is_admin, COALESCE(is_active, true) AS is_active`,
            [username, email, hashed, adminFlag, fn, ln, cityVillage]
          );
        } catch (e1b) {
          if (e1b.code === '42703') {
            try {
              result = await db.query(
                `INSERT INTO users (username, email, password, is_admin, is_active, first_name, last_name, city, village)
                 VALUES ($1, $2, $3, $4, true, $5, $6, $7, $8)
                 RETURNING id, username, email, created_at, COALESCE(is_admin, false) AS is_admin, COALESCE(is_active, true) AS is_active`,
                [username, email, hashed, adminFlag, fn, ln, city, village]
              );
            } catch (e1c) {
              if (e1c.code === '42703') {
                try {
                  result = await db.query(
                    `INSERT INTO users (username, email, password, is_admin, is_active)
                     VALUES ($1, $2, $3, $4, true)
                     RETURNING id, username, email, created_at, COALESCE(is_admin, false) AS is_admin, COALESCE(is_active, true) AS is_active`,
                    [username, email, hashed, adminFlag]
                  );
                } catch (e2) {
                  if (e2.code === '42703') {
                    try {
                      result = await db.query(
                        `INSERT INTO users (username, email, password, is_admin, first_name, last_name, city_village)
                         VALUES ($1, $2, $3, $4, $5, $6, $7)
                         RETURNING id, username, email, created_at, COALESCE(is_admin, false) AS is_admin`,
                        [username, email, hashed, adminFlag, fn, ln, cityVillage]
                      );
                      result.rows[0].is_active = true;
                    } catch (e3) {
                      if (e3.code === '42703') {
                        result = await db.query(
                          `INSERT INTO users (username, email, password, is_admin)
                           VALUES ($1, $2, $3, $4)
                           RETURNING id, username, email, created_at, COALESCE(is_admin, false) AS is_admin`,
                          [username, email, hashed, adminFlag]
                        );
                        result.rows[0].is_active = true;
                      } else throw e3;
                    }
                  } else throw e2;
                }
              } else throw e1c;
            }
          } else throw e1b;
        }
      } else throw e;
    }

    const user = result.rows[0];
    await ensureUserHasDefaultFamily(user.id, user.username);
    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: 'admin.user_create',
      entityType: 'user',
      entityId: user.id,
      summary: `Created user ${user.username}`,
    });
    res.status(201).json({ user });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Username or email already exists' });
    next(err);
  }
};

exports.listUsers = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const q = String(req.query.q || '').trim();
    const role = String(req.query.role || '').trim();
    const status = String(req.query.status || '').trim();

    let items;
    let countRow;
    try {
      ({ items, countRow } = await queryAdminUserListPage(limit, offset, q, role, status, 'full'));
    } catch (e) {
      if (e.code === '42703') {
        try {
          ({ items, countRow } = await queryAdminUserListPage(limit, offset, q, role, status, 'split'));
        } catch (e2) {
          if (e2.code === '42703') {
            try {
              ({ items, countRow } = await queryAdminUserListPage(limit, offset, q, role, status, 'profile'));
            } catch (e3) {
              if (e3.code === '42703') {
                ({ items, countRow } = await queryAdminUserListPage(limit, offset, q, role, status, 'minimal'));
              } else throw e3;
            }
          } else throw e2;
        }
      } else throw e;
    }

    res.json({
      items: items.rows,
      total: Number(countRow.rows[0]?.c || 0),
      limit,
      offset,
    });
  } catch (err) {
    next(err);
  }
};

exports.getUser = async (req, res, next) => {
  try {
    const id = parseUserId(req);
    if (!id) return res.status(400).json({ error: 'Invalid user id' });

    let r;
    try {
      r = await db.query(
        `SELECT id, username, email, first_name, last_name, phone, gender, date_of_birth, city_village, city, village,
                COALESCE(is_admin, false) AS is_admin, COALESCE(is_active, true) AS is_active, created_at
         FROM users WHERE id = $1`,
        [id]
      );
    } catch (e) {
      if (e.code === '42703') {
        try {
          r = await db.query(
            `SELECT id, username, email, first_name, last_name, phone, gender, date_of_birth, city, village,
                    COALESCE(is_admin, false) AS is_admin, COALESCE(is_active, true) AS is_active, created_at
             FROM users WHERE id = $1`,
            [id]
          );
          if (r.rows[0]) {
            r.rows[0].city_village = null;
          }
        } catch (e2) {
          if (e2.code === '42703') {
            try {
              r = await db.query(
                `SELECT id, username, email, first_name, last_name, phone, gender, date_of_birth,
                        COALESCE(is_admin, false) AS is_admin, COALESCE(is_active, true) AS is_active, created_at
                 FROM users WHERE id = $1`,
                [id]
              );
              if (r.rows[0]) {
                r.rows[0].city_village = null;
                r.rows[0].city = null;
                r.rows[0].village = null;
              }
            } catch (e3) {
              if (e3.code === '42703') {
                r = await db.query(
                  'SELECT id, username, email, COALESCE(is_admin, false) AS is_admin, created_at FROM users WHERE id = $1',
                  [id]
                );
                if (r.rows[0]) {
                  r.rows[0].is_active = true;
                  r.rows[0].first_name = null;
                  r.rows[0].last_name = null;
                  r.rows[0].phone = null;
                  r.rows[0].gender = null;
                  r.rows[0].date_of_birth = null;
                  r.rows[0].city_village = null;
                  r.rows[0].city = null;
                  r.rows[0].village = null;
                }
              } else throw e3;
            }
          } else throw e2;
        }
      } else throw e;
    }

    if (!r.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ user: r.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.validatePatchUser = [
  body('email').isEmail().withMessage('Valid email required'),
  body('first_name').optional().trim().isLength({ max: 120 }),
  body('last_name').optional().trim().isLength({ max: 120 }),
  body('phone').optional().trim().isLength({ max: 64 }),
  body('gender').optional({ checkFalsy: true }).isIn(GENDER_VALUES).withMessage('Invalid gender'),
  body('date_of_birth')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Invalid date of birth'),
  body('city_village').optional().trim().isLength({ max: 255 }),
  body('city').optional().trim().isLength({ max: 255 }),
  body('village').optional().trim().isLength({ max: 255 }),
  body('is_admin').optional().isBoolean(),
  body('is_active').optional().isBoolean(),
];

exports.patchUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const id = parseUserId(req);
    if (!id) return res.status(400).json({ error: 'Invalid user id' });

    const target = await db.query(
      'SELECT id, username, COALESCE(is_admin, false) AS is_admin FROM users WHERE id = $1',
      [id]
    );
    if (!target.rows[0]) return res.status(404).json({ error: 'User not found' });
    const t = target.rows[0];

    const { email } = req.body;
    const firstRaw = req.body.first_name != null ? String(req.body.first_name).trim() : '';
    const lastRaw = req.body.last_name != null ? String(req.body.last_name).trim() : '';
    const fn = firstRaw === '' ? null : firstRaw;
    const ln = lastRaw === '' ? null : lastRaw;
    const phoneRaw = req.body.phone != null ? String(req.body.phone).trim() : '';
    const phone = phoneRaw === '' ? null : phoneRaw;
    const genderVal = req.body.gender && String(req.body.gender).trim() ? String(req.body.gender).trim() : null;
    const dobRaw = req.body.date_of_birth != null ? String(req.body.date_of_birth).trim() : '';
    const dobVal = dobRaw === '' ? null : dobRaw.slice(0, 10);
    const cvRaw = req.body.city_village != null ? String(req.body.city_village).trim() : '';
    const cityVillage = cvRaw === '' ? null : cvRaw;
    const cityRaw = req.body.city != null ? String(req.body.city).trim() : '';
    const villageRaw = req.body.village != null ? String(req.body.village).trim() : '';
    const city = cityRaw === '' ? null : cityRaw;
    const village = villageRaw === '' ? null : villageRaw;

    let isAdmin = t.is_admin;
    if (req.body.is_admin !== undefined && req.body.is_admin !== null) {
      isAdmin = req.body.is_admin === true || req.body.is_admin === 'true';
    }

    let isActive = true;
    let activeRow;
    try {
      activeRow = await db.query('SELECT COALESCE(is_active, true) AS a FROM users WHERE id = $1', [id]);
    } catch (e) {
      if (e.code === '42703') activeRow = { rows: [{ a: true }] };
      else throw e;
    }
    isActive = activeRow.rows[0]?.a !== false;
    if (req.body.is_active !== undefined && req.body.is_active !== null) {
      isActive = req.body.is_active === true || req.body.is_active === 'true';
    }

    if (isActive === false) {
      if (id === req.user.id) {
        return res.status(400).json({ error: 'You cannot disable your own account.' });
      }
      if (t.is_admin) {
        const n = await countActiveAdmins();
        if (n <= 1) {
          return res.status(400).json({ error: 'Cannot disable the only active administrator.' });
        }
      }
    }

    if (isAdmin === false && t.is_admin) {
      const adminCount = await db.query('SELECT COUNT(*)::int AS c FROM users WHERE COALESCE(is_admin, false) = true');
      if (adminCount.rows[0].c <= 1) {
        return res.status(400).json({ error: 'Cannot remove admin from the only administrator.' });
      }
    }

    const dupEmail = await db.query(
      'SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) AND id <> $2',
      [email, id]
    );
    if (dupEmail.rows[0]) return res.status(400).json({ error: 'That email is already in use' });

    try {
      await db.query(
        `UPDATE users SET email = $1, first_name = $2, last_name = $3, phone = $4, gender = $5, date_of_birth = $6,
                city_village = $7, city = $8, village = $9, is_admin = $10, is_active = $11
         WHERE id = $12`,
        [email, fn, ln, phone, genderVal, dobVal, cityVillage, city, village, isAdmin, isActive, id]
      );
    } catch (e) {
      if (e.code === '42703') {
        try {
          await db.query(
            `UPDATE users SET email = $1, first_name = $2, last_name = $3, phone = $4, gender = $5, date_of_birth = $6,
                    city = $7, village = $8, is_admin = $9, is_active = $10
             WHERE id = $11`,
            [email, fn, ln, phone, genderVal, dobVal, city, village, isAdmin, isActive, id]
          );
        } catch (e1b) {
          if (e1b.code === '42703') {
            try {
              await db.query(
                `UPDATE users SET email = $1, first_name = $2, last_name = $3, phone = $4, gender = $5, date_of_birth = $6,
                        is_admin = $7, is_active = $8
                 WHERE id = $9`,
                [email, fn, ln, phone, genderVal, dobVal, isAdmin, isActive, id]
              );
            } catch (e2) {
              if (e2.code === '42703') {
                await db.query('UPDATE users SET email = $1, is_admin = $2 WHERE id = $3', [email, isAdmin, id]);
                try {
                  await db.query('UPDATE users SET is_active = $1 WHERE id = $2', [isActive, id]);
                } catch (e3) {
                  if (e3.code !== '42703') throw e3;
                }
              } else if (e2.code === '23505') {
                return res.status(400).json({ error: 'Email already exists' });
              } else throw e2;
            }
          } else if (e1b.code === '23505') {
            return res.status(400).json({ error: 'Email already exists' });
          } else throw e1b;
        }
      } else if (e.code === '23505') {
        return res.status(400).json({ error: 'Email already exists' });
      } else throw e;
    }

    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: 'admin.user_update',
      entityType: 'user',
      entityId: id,
      summary: `Updated user ${t.username}`,
    });

    let fresh;
    try {
      fresh = await db.query(
        `SELECT id, username, email, first_name, last_name, phone, gender, date_of_birth, city_village, city, village,
                COALESCE(is_admin, false) AS is_admin, COALESCE(is_active, true) AS is_active, created_at
         FROM users WHERE id = $1`,
        [id]
      );
    } catch (e) {
      if (e.code === '42703') {
        try {
          fresh = await db.query(
            `SELECT id, username, email, first_name, last_name, phone, gender, date_of_birth, city, village,
                    COALESCE(is_admin, false) AS is_admin, COALESCE(is_active, true) AS is_active, created_at
             FROM users WHERE id = $1`,
            [id]
          );
          if (fresh.rows[0]) fresh.rows[0].city_village = null;
        } catch (e2) {
          if (e2.code === '42703') {
            try {
              fresh = await db.query(
                `SELECT id, username, email, first_name, last_name, phone, gender, date_of_birth,
                        COALESCE(is_admin, false) AS is_admin, COALESCE(is_active, true) AS is_active, created_at
                 FROM users WHERE id = $1`,
                [id]
              );
              if (fresh.rows[0]) {
                fresh.rows[0].city_village = null;
                fresh.rows[0].city = null;
                fresh.rows[0].village = null;
              }
            } catch (e3) {
              if (e3.code === '42703') {
                fresh = await db.query(
                  'SELECT id, username, email, COALESCE(is_admin, false) AS is_admin, created_at FROM users WHERE id = $1',
                  [id]
                );
                if (fresh.rows[0]) {
                  fresh.rows[0].is_active = true;
                  fresh.rows[0].first_name = null;
                  fresh.rows[0].last_name = null;
                  fresh.rows[0].phone = null;
                  fresh.rows[0].gender = null;
                  fresh.rows[0].date_of_birth = null;
                  fresh.rows[0].city_village = null;
                  fresh.rows[0].city = null;
                  fresh.rows[0].village = null;
                }
              } else throw e3;
            }
          } else throw e2;
        }
      } else throw e;
    }
    res.json({ user: fresh.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.validateResetPassword = [
  body('newPassword').isLength({ min: 6 }).withMessage('Password at least 6 characters'),
  body('confirmPassword')
    .notEmpty()
    .withMessage('Confirm password required')
    .custom((v, { req }) => v === req.body.newPassword)
    .withMessage('Passwords do not match'),
];

exports.deactivateUser = async (req, res, next) => {
  try {
    const id = parseUserId(req);
    if (!id) return res.status(400).json({ error: 'Invalid user id' });

    const target = await db.query(
      'SELECT id, username, COALESCE(is_admin, false) AS is_admin FROM users WHERE id = $1',
      [id]
    );
    if (!target.rows[0]) return res.status(404).json({ error: 'User not found' });
    const t = target.rows[0];

    if (id === req.user.id) {
      return res.status(400).json({ error: 'You cannot disable your own account.' });
    }
    if (t.is_admin) {
      const n = await countActiveAdmins();
      if (n <= 1) {
        return res.status(400).json({ error: 'Cannot disable the only active administrator.' });
      }
    }

    try {
      await db.query('UPDATE users SET is_active = false WHERE id = $1', [id]);
    } catch (e) {
      if (e.code === '42703') {
        return res.status(503).json({ error: 'Run database migration add-users-is-active.sql to enable account status.' });
      }
      throw e;
    }

    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: 'admin.user_deactivate',
      entityType: 'user',
      entityId: id,
      summary: `Deactivated ${t.username}`,
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

exports.activateUser = async (req, res, next) => {
  try {
    const id = parseUserId(req);
    if (!id) return res.status(400).json({ error: 'Invalid user id' });

    const t = await db.query('SELECT id, username FROM users WHERE id = $1', [id]);
    if (!t.rows[0]) return res.status(404).json({ error: 'User not found' });

    try {
      await db.query('UPDATE users SET is_active = true WHERE id = $1', [id]);
    } catch (e) {
      if (e.code === '42703') {
        return res.status(503).json({ error: 'Run database migration add-users-is-active.sql.' });
      }
      throw e;
    }

    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: 'admin.user_activate',
      entityType: 'user',
      entityId: id,
      summary: `Activated ${t.rows[0].username}`,
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

exports.resetUserPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const id = parseUserId(req);
    if (!id) return res.status(400).json({ error: 'Invalid user id' });

    const u = await db.query('SELECT id, username FROM users WHERE id = $1', [id]);
    if (!u.rows[0]) return res.status(404).json({ error: 'User not found' });

    let active = true;
    try {
      const a = await db.query('SELECT COALESCE(is_active, true) AS a FROM users WHERE id = $1', [id]);
      active = a.rows[0]?.a !== false;
    } catch (e) {
      if (e.code !== '42703') throw e;
    }
    if (!active) return res.status(400).json({ error: 'Cannot reset password for a disabled account. Enable it first.' });

    const hashed = await bcrypt.hash(String(req.body.newPassword), 10);
    await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, id]);

    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: 'admin.user_password_reset',
      entityType: 'user',
      entityId: id,
      summary: `Password reset for ${u.rows[0].username}`,
    });

    res.json({ ok: true, message: 'Password updated' });
  } catch (err) {
    next(err);
  }
};
