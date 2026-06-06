const db = require('../database/db');
const { logAudit } = require('../lib/auditLog');
const { body, validationResult } = require('express-validator');
const { useCloudinary } = require('../middleware/upload');

exports.validateEvent = [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('event_date').trim().notEmpty().withMessage('Event date required'),
  body('description').optional().trim(),
];

exports.list = async (req, res, next) => {
  try {
    const upcoming = req.query.upcoming === 'true';
    let query = 'SELECT id, family_id, title, event_date, description, image_path FROM events WHERE family_id = $1';
    if (upcoming) query += ' AND event_date >= CURRENT_DATE';
    query += ' ORDER BY event_date ASC';
    let result;
    try {
      result = await db.query(query, [req.familyId]);
    } catch (e) {
      if (e.code !== '42703') throw e;
      let fallback = 'SELECT id, family_id, title, event_date, description FROM events WHERE family_id = $1';
      if (upcoming) fallback += ' AND event_date >= CURRENT_DATE';
      fallback += ' ORDER BY event_date ASC';
      result = await db.query(fallback, [req.familyId]);
      result.rows.forEach((row) => {
        row.image_path = null;
      });
    }
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

exports.add = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { title, event_date, description } = req.body;
    const imagePath = req.file
      ? (useCloudinary ? req.file.path : `/uploads/events/${req.file.filename}`)
      : null;
    let result;
    try {
      result = await db.query(
        `INSERT INTO events (family_id, title, event_date, description, image_path) VALUES ($1, $2, $3, $4, $5)
         RETURNING id, family_id, title, event_date, description, image_path`,
        [req.familyId, title, event_date, description || null, imagePath]
      );
    } catch (e) {
      if (e.code !== '42703') throw e;
      result = await db.query(
        `INSERT INTO events (family_id, title, event_date, description) VALUES ($1, $2, $3, $4)
         RETURNING id, family_id, title, event_date, description`,
        [req.familyId, title, event_date, description || null]
      );
      result.rows[0].image_path = null;
    }
    const row = result.rows[0];
    await logAudit({
      userId: req.user?.id,
      username: req.user?.username,
      action: 'event.create',
      entityType: 'event',
      entityId: row.id,
      summary: title,
    });
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
};
