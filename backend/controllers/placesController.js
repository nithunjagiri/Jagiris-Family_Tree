const db = require('../database/db');
const { ensurePlacesAuditSchema } = require('../database/ensurePlacesAuditSchema');
const { logAudit } = require('../lib/auditLog');
const { body, validationResult } = require('express-validator');

exports.validatePlace = [
  body('name').trim().isLength({ min: 1, max: 500 }).withMessage('Name required'),
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
  body('notes').optional().trim(),
];

exports.list = async (req, res, next) => {
  try {
    const familyId = req.familyId;
    const fromMembers = await db.query(
      `SELECT place, COUNT(*)::int AS member_count
       FROM (
         SELECT COALESCE(NULLIF(TRIM(p.name), ''), NULLIF(TRIM(fm.birth_place), '')) AS place
         FROM family_members fm
         LEFT JOIN places p ON p.id = fm.birth_place_id AND p.family_id = fm.family_id
         WHERE fm.family_id = $1
       ) x
       WHERE place IS NOT NULL
       GROUP BY place
       ORDER BY member_count DESC, place ASC`
      ,
      [familyId]
    );
    let pins = { rows: [] };
    try {
      pins = await db.query(
        'SELECT id, family_id, name, latitude, longitude, notes, created_at FROM places WHERE family_id = $1 ORDER BY name ASC',
        [familyId]
      );
    } catch (e) {
      if (e.code === '42P01') {
        try {
          await ensurePlacesAuditSchema();
          pins = await db.query(
            'SELECT id, family_id, name, latitude, longitude, notes, created_at FROM places WHERE family_id = $1 ORDER BY name ASC',
            [familyId]
          );
        } catch (_) {
          pins = { rows: [] };
        }
      } else throw e;
    }
    res.json({
      birthPlaces: fromMembers.rows,
      pins: pins.rows || [],
    });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, latitude, longitude, notes } = req.body;
    let result;
    try {
      result = await db.query(
        `INSERT INTO places (family_id, name, latitude, longitude, notes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, family_id, name, latitude, longitude, notes, created_at`,
        [req.familyId, name.trim(), Number(latitude), Number(longitude), notes?.trim() || null]
      );
    } catch (e) {
      if (e.code === '42P01') {
        try {
          await ensurePlacesAuditSchema();
          result = await db.query(
            `INSERT INTO places (family_id, name, latitude, longitude, notes)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, family_id, name, latitude, longitude, notes, created_at`,
            [req.familyId, name.trim(), Number(latitude), Number(longitude), notes?.trim() || null]
          );
        } catch (e2) {
          return res.status(503).json({
            error:
              'Could not create the places table. Check database connection and server logs, or run backend/database/add-places-audit-admin.sql manually.',
          });
        }
      } else throw e;
    }
    const row = result.rows[0];
    await logAudit({
      userId: req.user?.id,
      username: req.user?.username,
      action: 'place.create',
      entityType: 'place',
      entityId: row.id,
      summary: name.trim(),
    });
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const result = await db.query('DELETE FROM places WHERE id = $1 AND family_id = $2 RETURNING id', [id, req.familyId]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Place not found' });
    await logAudit({
      userId: req.user?.id,
      username: req.user?.username,
      action: 'place.delete',
      entityType: 'place',
      entityId: id,
      summary: `Deleted place id ${id}`,
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

exports.membersByPlace = async (req, res, next) => {
  try {
    const place = (req.query.place || '').trim();
    if (!place) return res.status(400).json({ error: 'place query parameter required' });

    const result = await db.query(
      `SELECT fm.id, fm.name, fm.surname, fm.date_of_birth, fm.gender, fm.phone, fm.profile_photo
       FROM family_members fm
       LEFT JOIN places p ON p.id = fm.birth_place_id AND p.family_id = fm.family_id
       WHERE fm.family_id = $1
         AND (
           LOWER(TRIM(COALESCE(p.name, ''))) = LOWER($2)
           OR LOWER(TRIM(COALESCE(fm.birth_place, ''))) = LOWER($2)
         )
       ORDER BY fm.name ASC, fm.surname ASC`,
      [req.familyId, place.toLowerCase()]
    );

    res.json({ place, members: result.rows });
  } catch (err) {
    next(err);
  }
};
