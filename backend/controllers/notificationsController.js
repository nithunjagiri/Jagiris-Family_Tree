const db = require('../database/db');
const { logAudit } = require('../lib/auditLog');
const { buildComputedFeedItems } = require('../lib/computedFeedItems');
const { getDismissedFeedKeys, dismissFeedItem } = require('../lib/feedDismissals');
const { sendToUsers } = require('../lib/fcmSender');
const { scheduleInAppNotification } = require('../lib/inAppNotifications');
const { getFamilyRecipientUserIds } = require('../lib/notificationRecipients');
const { ensureAnnouncementsSchema } = require('../database/ensureAnnouncementsSchema');
const { ensurePlacesAuditSchema } = require('../database/ensurePlacesAuditSchema');
const { body, validationResult } = require('express-validator');

async function ensureAnnouncementsAndRetry(err, retryFn) {
  if (err && err.code === '42P01') {
    await ensureAnnouncementsSchema();
    return retryFn();
  }
  throw err;
}

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
          const linkPath = '/#dashboard-announcements';
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
      includeActor: true,
      targetAudience,
      type: 'announcement',
      title: `Announcement: ${title}`,
      body: announcementBody || 'A new announcement was posted for your family.',
      entityType: 'announcement',
      entityId: announcement.id,
      linkPath: '/#dashboard-announcements',
      actorUserId: req.user.id,
      referenceKey: `announcement-${announcement.id}`,
    });

    res.status(201).json(announcement);
  } catch (err) {
    if (err.code === '42P01') {
      try {
        await ensureAnnouncementsSchema();
        return exports.createAnnouncement(req, res, next);
      } catch (err2) {
        return next(err2);
      }
    }
    next(err);
  }
};

exports.listAnnouncements = async (req, res, next) => {
  const run = async () => {
    const familyId = req.familyId;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const isAdmin = req.user.isAdmin === true;

    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total FROM announcements
       WHERE family_id = $1
         AND ($2::boolean OR COALESCE(target_audience, 'all') = 'all')`,
      [familyId, isAdmin]
    );
    const result = await db.query(
      `SELECT a.*, u.username AS created_by_username
       FROM announcements a
       LEFT JOIN users u ON u.id = a.created_by
       WHERE a.family_id = $1
         AND ($2::boolean OR COALESCE(a.target_audience, 'all') = 'all')
       ORDER BY a.created_at DESC
       LIMIT $3 OFFSET $4`,
      [familyId, isAdmin, limit, offset]
    );

    return {
      items: result.rows,
      total: countResult.rows[0].total,
    };
  };

  try {
    res.json(await run());
  } catch (err) {
    try {
      res.json(await ensureAnnouncementsAndRetry(err, run));
    } catch (err2) {
      next(err2);
    }
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
  const run = async () => {
    const familyId = req.familyId;
    const userId = req.user.id;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);

    const dismissed = await getDismissedFeedKeys(userId, familyId);

    const unreadStored = await db.query(
      `SELECT COUNT(*)::int AS c FROM user_notifications un
       WHERE un.user_id = $1
         AND un.family_id IN (SELECT fm.family_id FROM family_memberships fm WHERE fm.user_id = $1)
         AND un.read_at IS NULL`,
      [userId]
    );

    const itemsResult = await db.query(
      `SELECT un.id, un.type, un.title, un.body, un.entity_type, un.entity_id, un.link_path,
              un.actor_user_id, un.read_at, un.created_at
       FROM user_notifications un
       WHERE un.user_id = $1
         AND un.family_id IN (SELECT fm.family_id FROM family_memberships fm WHERE fm.user_id = $1)
       ORDER BY un.created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    const stored = itemsResult.rows.map((row) => ({
      ...row,
      id: String(row.id),
      is_computed: false,
    }));

    const computed = await buildComputedFeedItems(familyId, dismissed);
    const merged = [...stored, ...computed]
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, limit);

    const unreadCount = (unreadStored.rows[0]?.c ?? 0) + computed.length;

    return {
      items: merged,
      unreadCount,
      storedCount: stored.length,
      computedCount: computed.length,
    };
  };

  try {
    res.json(await run());
  } catch (err) {
    if (err.code === '42P01') {
      try {
        await ensurePlacesAuditSchema();
        res.json(await run());
        return;
      } catch (err2) {
        return next(err2);
      }
    }
    next(err);
  }
};

exports.markFeedRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const idStr = String(id);

    if (idStr.startsWith('computed:')) {
      const referenceKey = idStr.slice('computed:'.length);
      await dismissFeedItem(req.user.id, req.familyId, referenceKey);
      return res.json({ ok: true, dismissed: true });
    }

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
    if (err.code === '42P01') {
      try {
        await ensurePlacesAuditSchema();
        return exports.markFeedRead(req, res, next);
      } catch (err2) {
        return next(err2);
      }
    }
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

    const computed = await buildComputedFeedItems(req.familyId, new Set());
    for (const item of computed) {
      if (item.reference_key) {
        await dismissFeedItem(req.user.id, req.familyId, item.reference_key);
      }
    }

    res.json({ ok: true });
  } catch (err) {
    if (err.code === '42P01') {
      try {
        await ensurePlacesAuditSchema();
        return exports.markAllFeedRead(req, res, next);
      } catch (err2) {
        return next(err2);
      }
    }
    next(err);
  }
};

exports.sendTestNotification = async (req, res, next) => {
  try {
    const familyId = req.familyId;
    const refKey = `test-${Date.now()}`;
    const { notifyFamilyUsers } = require('../lib/inAppNotifications');

    await notifyFamilyUsers({
      familyId,
      excludeUserId: null,
      includeActor: true,
      type: 'test',
      title: 'Test notification',
      body: 'Your notification bell is working. Stored notifications are delivered correctly.',
      entityType: 'system',
      entityId: null,
      linkPath: '/',
      actorUserId: req.user.id,
      referenceKey: refKey,
    });

    res.json({ ok: true, message: 'Test notification sent to your family users.' });
  } catch (err) {
    next(err);
  }
};
