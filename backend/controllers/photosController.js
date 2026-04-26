const db = require('../database/db');
const { logAudit } = require('../lib/auditLog');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');

exports.validatePhoto = [
  body('title').trim().notEmpty().withMessage('Title required'),
];

exports.list = async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT id, family_id, title, image_path, uploaded_at FROM photos WHERE family_id = $1 ORDER BY uploaded_at DESC',
      [req.familyId]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

exports.upload = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image file required' });
    const title = req.body.title || req.file.originalname || 'Untitled';
    const image_path = `/uploads/gallery/${req.file.filename}`;

    const result = await db.query(
      'INSERT INTO photos (family_id, title, image_path, uploaded_at) VALUES ($1, $2, $3, NOW()) RETURNING id, family_id, title, image_path, uploaded_at',
      [req.familyId, title, image_path]
    );
    const row = result.rows[0];
    await logAudit({
      userId: req.user?.id,
      username: req.user?.username,
      action: 'photo.upload',
      entityType: 'photo',
      entityId: row.id,
      summary: title,
    });
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const result = await db.query('SELECT id, image_path FROM photos WHERE id = $1 AND family_id = $2', [req.params.id, req.familyId]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Photo not found' });
    const image_path = result.rows[0].image_path;
    const fullPath = path.join(__dirname, '..', image_path);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    await db.query('DELETE FROM photos WHERE id = $1 AND family_id = $2', [req.params.id, req.familyId]);
    await logAudit({
      userId: req.user?.id,
      username: req.user?.username,
      action: 'photo.delete',
      entityType: 'photo',
      entityId: Number(req.params.id),
      summary: result.rows[0].image_path,
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
