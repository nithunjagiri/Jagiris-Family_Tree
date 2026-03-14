const db = require('../database/db');
const { body, validationResult } = require('express-validator');

exports.validateEvent = [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('event_date').trim().notEmpty().withMessage('Event date required'),
  body('description').optional().trim(),
];

exports.list = async (req, res, next) => {
  try {
    const upcoming = req.query.upcoming === 'true';
    let query = 'SELECT id, title, event_date, description FROM events';
    if (upcoming) query += " WHERE event_date >= CURRENT_DATE";
    query += ' ORDER BY event_date ASC';
    const result = await db.query(query);
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
    const result = await db.query(
      `INSERT INTO events (title, event_date, description) VALUES ($1, $2, $3)
       RETURNING id, title, event_date, description`,
      [title, event_date, description || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};
