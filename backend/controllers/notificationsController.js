const db = require('../database/db');
const { logAudit } = require('../lib/auditLog');
const { sendToUsers } = require('../lib/fcmSender');
const { body, validationResult } = require('express-validator');

// ── Push token management ──

exports.registerToken = async (req, res, next) => {
  try {
    const { token, platform } = req.body;
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return res.status(400).json({ error: 'token is required' });
    }
    const plat = (platform || 'android').toLowerCase();

    await db.query(
      `INSERT INTO push_notification_tokens (user_id, token, platform, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, token) DO UPDATE SET updated_at = NOW(), platform = $3`,
      [req.user.id, token.trim(), plat]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

exports.unregisterToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'token is required' });
    await db.query(
      `DELETE FROM push_notification_tokens WHERE user_id = $1 AND token = $2`,
      [req.user.id, token]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// ── Announcements (admin) ──

exports.validateAnnouncement = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('body').optional().trim(),
];

exports.createAnnouncement = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { title, body: announcementBody } = req.body;
    const familyId = req.familyId;

    const result = await db.query(
      `INSERT INTO announcements (family_id, created_by, title, body)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [familyId, req.user.id, title, announcementBody || null]
    );
    const announcement = result.rows[0];

    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: 'announcement.create',
      entityType: 'announcement',
      entityId: announcement.id,
      summary: title,
    });

    // Send push to all family members asynchronously (don't block response)
    setImmediate(async () => {
      try {
        const members = await db.query(
          `SELECT user_id FROM family_memberships WHERE family_id = $1`,
          [familyId]
        );
        const userIds = members.rows.map((r) => r.user_id);
        if (userIds.length > 0) {
          const refKey = `announcement-${announcement.id}`;
          await sendToUsers(
            userIds,
            'announcement',
            refKey,
            title,
            announcementBody || 'New announcement from your family',
            { type: 'announcement', announcementId: String(announcement.id) }
          );
          await db.query(
            `UPDATE announcements SET sent_at = NOW() WHERE id = $1`,
            [announcement.id]
          );
        }
      } catch (err) {
        console.error('[announcements] push send error:', err.message);
      }
    });

    res.status(201).json(announcement);
  } catch (err) {
    next(err);
  }
};

exports.listAnnouncements = async (req, res, next) => {
  try {
    const familyId = req.familyId;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total FROM announcements WHERE family_id = $1`,
      [familyId]
    );
    const result = await db.query(
      `SELECT a.*, u.username AS created_by_username
       FROM announcements a
       LEFT JOIN users u ON u.id = a.created_by
       WHERE a.family_id = $1
       ORDER BY a.created_at DESC
       LIMIT $2 OFFSET $3`,
      [familyId, limit, offset]
    );

    res.json({
      items: result.rows,
      total: countResult.rows[0].total,
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `DELETE FROM announcements WHERE id = $1 AND family_id = $2 RETURNING id, title`,
      [id, req.familyId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: 'announcement.delete',
      entityType: 'announcement',
      entityId: Number(id),
      summary: result.rows[0].title,
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
