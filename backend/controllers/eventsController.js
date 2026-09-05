const fs = require('fs');
const path = require('path');
const db = require('../database/db');
const { logAudit } = require('../lib/auditLog');
const { scheduleInAppNotification } = require('../lib/inAppNotifications');
const { sendToUsers } = require('../lib/fcmSender');
const { getFamilyRecipientUserIds } = require('../lib/notificationRecipients');
const { assertCanDeleteEvent, assertCanEditEvent } = require('../lib/eventAccess');
const { body, validationResult } = require('express-validator');
const { useCloudinary } = require('../middleware/upload');

const EVENT_SELECT = `
  e.id, e.family_id, e.title, e.event_date, e.description, e.image_path, e.created_by,
  u.username AS created_by_username
`;

async function fetchEventById(id, familyId) {
  const result = await db.query(
    `SELECT ${EVENT_SELECT}
     FROM events e
     LEFT JOIN users u ON u.id = e.created_by
     WHERE e.id = $1 AND e.family_id = $2`,
    [id, familyId]
  );
  return result.rows[0] || null;
}

function removeLocalImage(imagePath) {
  if (!imagePath || useCloudinary || /^https?:\/\//.test(imagePath)) return;
  const fullPath = path.join(__dirname, '..', imagePath);
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
    } catch (_) {}
  }
}

exports.validateEvent = [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('event_date').trim().notEmpty().withMessage('Event date required'),
  body('description').optional().trim(),
];

exports.list = async (req, res, next) => {
  try {
    const upcoming = req.query.upcoming === 'true';
    let query = `SELECT ${EVENT_SELECT} FROM events e LEFT JOIN users u ON u.id = e.created_by WHERE e.family_id = $1`;
    if (upcoming) query += ' AND e.event_date >= CURRENT_DATE';
    query += ' ORDER BY e.event_date ASC';
    let result;
    try {
      result = await db.query(query, [req.familyId]);
    } catch (e) {
      if (e.code !== '42703') throw e;
      let fallback = 'SELECT id, family_id, title, event_date, description, image_path FROM events WHERE family_id = $1';
      if (upcoming) fallback += ' AND event_date >= CURRENT_DATE';
      fallback += ' ORDER BY event_date ASC';
      result = await db.query(fallback, [req.familyId]);
      result.rows.forEach((row) => {
        row.created_by = null;
        row.created_by_username = null;
        if (row.image_path === undefined) row.image_path = null;
      });
    }
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

exports.get = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    let row;
    try {
      row = await fetchEventById(id, req.familyId);
    } catch (e) {
      if (e.code !== '42703') throw e;
      const fallback = await db.query(
        'SELECT id, family_id, title, event_date, description, image_path FROM events WHERE id = $1 AND family_id = $2',
        [id, req.familyId]
      );
      row = fallback.rows[0] || null;
      if (row) {
        row.created_by = null;
        row.created_by_username = null;
      }
    }
    if (!row) return res.status(404).json({ error: 'Event not found' });
    res.json(row);
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
    const createdBy = req.user?.id ?? null;
    let result;
    try {
      result = await db.query(
        `INSERT INTO events (family_id, title, event_date, description, image_path, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, family_id, title, event_date, description, image_path, created_by`,
        [req.familyId, title, event_date, description || null, imagePath, createdBy]
      );
    } catch (e) {
      if (e.code !== '42703') throw e;
      result = await db.query(
        `INSERT INTO events (family_id, title, event_date, description, image_path) VALUES ($1, $2, $3, $4, $5)
         RETURNING id, family_id, title, event_date, description, image_path`,
        [req.familyId, title, event_date, description || null, imagePath]
      );
      result.rows[0].created_by = createdBy;
    }
    const row = result.rows[0];
    const linkPath = `/events/${row.id}`;
    await logAudit({
      userId: req.user?.id,
      username: req.user?.username,
      action: 'event.create',
      entityType: 'event',
      entityId: row.id,
      summary: title,
    });
    scheduleInAppNotification({
      familyId: req.familyId,
      excludeUserId: req.user?.id,
      includeActor: true,
      type: 'event_added',
      title: `New event: ${title}`,
      body: description || `A new family event was added for ${event_date}.`,
      entityType: 'event',
      entityId: row.id,
      linkPath,
      actorUserId: req.user?.id,
      referenceKey: `event_added-${row.id}`,
    });

    setImmediate(async () => {
      try {
        const userIds = await getFamilyRecipientUserIds(req.familyId, {
          excludeUserId: req.user?.id,
        });
        if (userIds.length === 0) return;
        const refKey = `event_added-${row.id}`;
        const pushTitle = `New event: ${title}`;
        const pushBody = description || `A new family event was added for ${event_date}.`;
        await sendToUsers(userIds, 'event_added', refKey, pushTitle, pushBody, {
          type: 'event_added',
          eventId: String(row.id),
          linkPath,
        });
      } catch (err) {
        console.error('[events] push send error:', err.message);
      }
    });

    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const existing = await fetchEventById(id, req.familyId);
    if (!existing) return res.status(404).json({ error: 'Event not found' });

    try {
      assertCanEditEvent(req.user, existing);
    } catch (authErr) {
      return res.status(authErr.status || 403).json({ error: authErr.message });
    }

    const { title, event_date, description } = req.body;
    const newImagePath = req.file
      ? (useCloudinary ? req.file.path : `/uploads/events/${req.file.filename}`)
      : existing.image_path;

    const result = await db.query(
      `UPDATE events
       SET title = $1, event_date = $2, description = $3, image_path = $4
       WHERE id = $5 AND family_id = $6
       RETURNING id, family_id, title, event_date, description, image_path, created_by`,
      [title, event_date, description || null, newImagePath, id, req.familyId]
    );

    if (req.file && existing.image_path && existing.image_path !== newImagePath) {
      removeLocalImage(existing.image_path);
    }

    const row = result.rows[0];
    row.created_by_username = existing.created_by_username;

    await logAudit({
      userId: req.user?.id,
      username: req.user?.username,
      action: 'event.update',
      entityType: 'event',
      entityId: id,
      summary: title,
    });

    res.json(row);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const existing = await fetchEventById(id, req.familyId);
    if (!existing) return res.status(404).json({ error: 'Event not found' });

    try {
      assertCanDeleteEvent(req.user, existing);
    } catch (authErr) {
      return res.status(authErr.status || 403).json({ error: authErr.message });
    }

    await db.query('DELETE FROM events WHERE id = $1 AND family_id = $2', [id, req.familyId]);
    removeLocalImage(existing.image_path);

    await logAudit({
      userId: req.user?.id,
      username: req.user?.username,
      action: 'event.delete',
      entityType: 'event',
      entityId: id,
      summary: existing.title,
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
