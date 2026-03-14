const db = require('../database/db');
const { body, validationResult } = require('express-validator');

const COLS =
  'id, name, surname, relation, date_of_birth, phone, profile_photo, father_id, mother_id, spouse_id, gender, email, birth_place, occupation, notes, date_of_death, created_at, updated_at';

exports.validateMember = [
  body('name').trim().notEmpty().withMessage('Name required'),
  body('surname').optional().trim(),
  body('relation').optional().trim(),
  body('date_of_birth').optional().trim(),
  body('phone').optional().trim(),
  body('gender').optional().trim(),
  body('email').optional().trim().isEmail().withMessage('Valid email if provided'),
  body('birth_place').optional().trim(),
  body('occupation').optional().trim(),
  body('notes').optional().trim(),
  body('date_of_death').optional().trim(),
  body('father_id').optional().isInt({ min: 1 }).withMessage('Invalid father_id').toInt(),
  body('mother_id').optional().isInt({ min: 1 }).withMessage('Invalid mother_id').toInt(),
  body('spouse_id').optional().isInt({ min: 1 }).withMessage('Invalid spouse_id').toInt(),
];

exports.list = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT ${COLS} FROM family_members ORDER BY name, surname NULLS LAST, id`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

exports.get = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT ${COLS} FROM family_members WHERE id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Family member not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

function toNum(v) {
  if (v === '' || v === undefined || v === null) return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

exports.create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const profile_photo = req.file ? `/uploads/profiles/${req.file.filename}` : null;
    const {
      name, surname, relation, date_of_birth, phone, gender, email, birth_place,
      occupation, notes, date_of_death, father_id, mother_id, spouse_id,
    } = req.body;

    const result = await db.query(
      `INSERT INTO family_members (
        name, surname, relation, date_of_birth, phone, profile_photo,
        father_id, mother_id, spouse_id, gender, email, birth_place, occupation, notes, date_of_death
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING ${COLS}`,
      [
        name, surname || null, relation || null, date_of_birth || null, phone || null, profile_photo,
        toNum(father_id), toNum(mother_id), toNum(spouse_id), gender || null, email || null,
        birth_place || null, occupation || null, notes || null, date_of_death || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const existing = await db.query('SELECT profile_photo FROM family_members WHERE id = $1', [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Family member not found' });
    const profile_photo = req.file ? `/uploads/profiles/${req.file.filename}` : existing.rows[0].profile_photo;

    const {
      name, surname, relation, date_of_birth, phone, gender, email, birth_place,
      occupation, notes, date_of_death, father_id, mother_id, spouse_id,
    } = req.body;

    await db.query(
      `UPDATE family_members SET
        name = $1, surname = $2, relation = $3, date_of_birth = $4, phone = $5, profile_photo = $6,
        father_id = $7, mother_id = $8, spouse_id = $9, gender = $10, email = $11,
        birth_place = $12, occupation = $13, notes = $14, date_of_death = $15, updated_at = NOW()
      WHERE id = $16`,
      [
        name, surname || null, relation || null, date_of_birth || null, phone || null, profile_photo,
        toNum(father_id), toNum(mother_id), toNum(spouse_id), gender || null, email || null,
        birth_place || null, occupation || null, notes || null, date_of_death || null, req.params.id,
      ]
    );
    const result = await db.query(`SELECT ${COLS} FROM family_members WHERE id = $1`, [req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM family_members WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Family member not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
