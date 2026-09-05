const crypto = require('crypto');
const db = require('../database/db');
const { logAudit } = require('../lib/auditLog');
const path = require('path');
const fs = require('fs');
const cloudinary = require('../lib/cloudinary');
const { useCloudinary } = require('../middleware/upload');

exports.list = async (req, res, next) => {
  try {
    let result;
    try {
      result = await db.query(
        'SELECT id, family_id, title, image_path, uploaded_at, upload_batch_id FROM photos WHERE family_id = $1 ORDER BY uploaded_at DESC',
        [req.familyId]
      );
    } catch (e) {
      if (e.code !== '42703') throw e;
      result = await db.query(
        'SELECT id, family_id, title, image_path, uploaded_at FROM photos WHERE family_id = $1 ORDER BY uploaded_at DESC',
        [req.familyId]
      );
      result.rows.forEach((row) => {
        row.upload_batch_id = null;
      });
    }
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

exports.upload = async (req, res, next) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) return res.status(400).json({ error: 'At least one image file is required' });
    if (files.length > 5) return res.status(400).json({ error: 'Maximum 5 images per upload' });

    const title = req.body.title || files[0].originalname || 'Untitled';
    const uploadBatchId = crypto.randomUUID();
    const inserted = [];

    for (const file of files) {
      const image_path = useCloudinary
        ? file.path
        : `/uploads/gallery/${file.filename}`;

      const result = await db.query(
        `INSERT INTO photos (family_id, title, image_path, uploaded_at, upload_batch_id)
         VALUES ($1, $2, $3, NOW(), $4)
         RETURNING id, family_id, title, image_path, uploaded_at, upload_batch_id`,
        [req.familyId, title, image_path, uploadBatchId]
      );
      inserted.push(result.rows[0]);
    }

    await logAudit({
      userId: req.user?.id,
      username: req.user?.username,
      action: 'photo.upload',
      entityType: 'photo',
      entityId: inserted[0].id,
      summary: `${title} (${inserted.length} photo${inserted.length > 1 ? 's' : ''})`,
    });

    res.status(201).json(inserted.length === 1 ? inserted[0] : inserted);
  } catch (err) {
    next(err);
  }
};

function extractCloudinaryPublicId(url) {
  try {
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;
    const afterUpload = parts[1].replace(/^v\d+\//, '');
    return afterUpload.replace(/\.[^.]+$/, '');
  } catch {
    return null;
  }
}

exports.remove = async (req, res, next) => {
  try {
    const result = await db.query('SELECT id, image_path FROM photos WHERE id = $1 AND family_id = $2', [req.params.id, req.familyId]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Photo not found' });
    const image_path = result.rows[0].image_path;

    if (useCloudinary && image_path && /^https?:\/\//.test(image_path)) {
      const publicId = extractCloudinaryPublicId(image_path);
      if (publicId) {
        try { await cloudinary.uploader.destroy(publicId); } catch (_) {}
      }
    } else if (image_path) {
      const fullPath = path.join(__dirname, '..', image_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }

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
