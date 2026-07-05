const db = require('../database/db');
const { getFamilyRecipientUserIds } = require('./notificationRecipients');
const { ensurePlacesAuditSchema } = require('../database/ensurePlacesAuditSchema');

let schemaReady = false;

async function ensureNotificationSchema() {
  if (schemaReady) return;
  await ensurePlacesAuditSchema();
  schemaReady = true;
}

/**
 * Repair shared-family access when data exists but no users are linked for notifications.
 * @param {number} familyId
 */
async function ensureFamilyNotificationRecipients(familyId) {
  const existing = await db.query(
    'SELECT COUNT(*)::int AS c FROM family_memberships WHERE family_id = $1',
    [familyId]
  );
  if ((existing.rows[0]?.c || 0) > 0) return;

  const hasMembers = await db.query(
    'SELECT 1 FROM family_members WHERE family_id = $1 LIMIT 1',
    [familyId]
  );
  if (hasMembers.rows.length === 0) return;

  await db.query(
    `INSERT INTO family_memberships (user_id, family_id, role)
     SELECT u.id, $1, CASE WHEN u.is_admin = TRUE THEN 'owner' ELSE 'member' END
     FROM users u
     ON CONFLICT (user_id, family_id) DO NOTHING`,
    [familyId]
  );
}

/**
 * Fan-out an in-app notification to family members.
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

  await ensureNotificationSchema();
  await ensureFamilyNotificationRecipients(familyId);

  let userIds = await getFamilyRecipientUserIds(familyId, {
    targetAudience,
    excludeUserId: includeActor ? null : excludeUserId,
  });

  const actorId = actorUserId ?? excludeUserId ?? null;
  if (userIds.length === 0 && actorId) {
    userIds = [actorId];
  }

  if (userIds.length === 0) {
    console.warn(`[inAppNotifications] no recipients for family ${familyId} type=${type}`);
    return;
  }

  let inserted = 0;
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
      inserted += 1;
    } catch (err) {
      console.error('[inAppNotifications] insert error:', err.message);
    }
  }

  if (inserted > 0) {
    console.log(`[inAppNotifications] ${type} → ${inserted} user(s) in family ${familyId}`);
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

module.exports = { notifyFamilyUsers, scheduleInAppNotification, ensureNotificationSchema };
