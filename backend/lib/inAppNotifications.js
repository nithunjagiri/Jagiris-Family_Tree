const db = require('../database/db');
const { getFamilyRecipientUserIds } = require('./notificationRecipients');

/**
 * Fan-out an in-app notification to family members except the actor.
 */
async function notifyFamilyUsers({
  familyId,
  excludeUserId,
  targetAudience = 'all',
  type,
  title,
  body,
  entityType,
  entityId,
  linkPath,
  actorUserId,
  referenceKey,
  /** When true, the user who triggered the action also receives the in-app notification. */
  includeActor = false,
}) {
  if (!familyId || !type || !title) return;

  let userIds = await getFamilyRecipientUserIds(familyId, {
    targetAudience,
    excludeUserId: includeActor ? null : excludeUserId,
  });

  // Solo-family fallback: still notify the actor when they would otherwise see an empty feed.
  if (userIds.length === 0 && excludeUserId) {
    userIds = [excludeUserId];
  }

  if (userIds.length === 0) return;

  for (const userId of userIds) {
    try {
      if (referenceKey) {
        const dup = await db.query(
          `SELECT 1 FROM user_notifications
           WHERE user_id = $1 AND type = $2 AND reference_key = $3 LIMIT 1`,
          [userId, type, referenceKey]
        );
        if (dup.rows.length > 0) continue;
      }

      await db.query(
        `INSERT INTO user_notifications (
           user_id, family_id, type, title, body,
           entity_type, entity_id, link_path, actor_user_id, reference_key
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          userId,
          familyId,
          type,
          title,
          body || null,
          entityType || null,
          entityId ?? null,
          linkPath || null,
          actorUserId ?? null,
          referenceKey || null,
        ]
      );
    } catch (err) {
      console.error('[inAppNotifications] insert error:', err.message);
    }
  }
}

/** Non-blocking wrapper for controller use after successful commits. */
function scheduleInAppNotification(payload) {
  setImmediate(() => {
    notifyFamilyUsers(payload).catch((err) => {
      console.error('[inAppNotifications] fan-out error:', err.message);
    });
  });
}

module.exports = { notifyFamilyUsers, scheduleInAppNotification };
