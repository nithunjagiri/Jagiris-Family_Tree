const db = require('../database/db');
const { logAudit } = require('../lib/auditLog');
const { sendToUsers } = require('../lib/fcmSender');
const { scheduleInAppNotification } = require('../lib/inAppNotifications');
const { getFamilyRecipientUserIds } = require('../lib/notificationRecipients');
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
  body('target_audience')
    .optional()
    .isIn(['all', 'admins'])
    .withMessage('target_audience must be all or admins'),
];

exports.createAnnouncement = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { title, body: announcementBody, target_audience: targetAudienceRaw } = req.body;
    const targetAudience = targetAudienceRaw === 'admins' ? 'admins' : 'all';
    const familyId = req.familyId;

    const result = await db.query(
      `INSERT INTO announcements (family_id, created_by, title, body, target_audience)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [familyId, req.user.id, title, announcementBody || null, targetAudience]
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

    // Send push asynchronously (don't block response)
    setImmediate(async () => {
      try {
        const userIds = await getFamilyRecipientUserIds(familyId, { targetAudience });
        if (userIds.length > 0) {
          const refKey = `announcement-${announcement.id}`;
          const linkPath = '/announcements';
          await sendToUsers(
            userIds,
            'announcement',
            refKey,
            title,
            announcementBody || 'New announcement from your family',
            { type: 'announcement', announcementId: String(announcement.id), linkPath }
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

    scheduleInAppNotification({
      familyId,
      excludeUserId: req.user.id,
      targetAudience,
      type: 'announcement',
      title: `Announcement: ${title}`,
      body: announcementBody || 'A new announcement was posted for your family.',
      entityType: 'announcement',
      entityId: announcement.id,
      linkPath: '/announcements',
      actorUserId: req.user.id,
      referenceKey: `announcement-${announcement.id}`,
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

// ── In-app notification feed (header bell) ──

exports.listFeed = async (req, res, next) => {
  try {
    const familyId = req.familyId;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);

    const unreadResult = await db.query(
      `SELECT COUNT(*)::int AS c FROM user_notifications
       WHERE user_id = $1 AND family_id = $2 AND read_at IS NULL`,
      [req.user.id, familyId]
    );

    const itemsResult = await db.query(
      `SELECT id, type, title, body, entity_type, entity_id, link_path,
              actor_user_id, read_at, created_at
       FROM user_notifications
       WHERE user_id = $1 AND family_id = $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [req.user.id, familyId, limit]
    );

    res.json({
      items: itemsResult.rows,
      unreadCount: unreadResult.rows[0]?.c ?? 0,
    });
  } catch (err) {
    next(err);
  }
};

exports.markFeedRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `UPDATE user_notifications SET read_at = NOW()
       WHERE id = $1 AND user_id = $2 AND family_id = $3 AND read_at IS NULL
       RETURNING id`,
      [id, req.user.id, req.familyId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

exports.markAllFeedRead = async (req, res, next) => {
  try {
    await db.query(
      `UPDATE user_notifications SET read_at = NOW()
       WHERE user_id = $1 AND family_id = $2 AND read_at IS NULL`,
      [req.user.id, req.familyId]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
