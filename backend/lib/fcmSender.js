const db = require('../database/db');

let firebaseAdmin = null;
let messagingInstance = null;
let initAttempted = false;

/**
 * Lazily initialises the Firebase Admin SDK from environment config.
 * Returns the messaging instance, or null when credentials are absent.
 */
function getMessaging() {
  if (initAttempted) return messagingInstance;
  initAttempted = true;

  const projectId = process.env.FCM_PROJECT_ID;
  const clientEmail = process.env.FCM_CLIENT_EMAIL;
  const privateKey = process.env.FCM_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('[fcm] Firebase credentials not configured – push notifications disabled.');
    return null;
  }

  try {
    firebaseAdmin = require('firebase-admin');
    firebaseAdmin.initializeApp({
      credential: firebaseAdmin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
    messagingInstance = firebaseAdmin.messaging();
    console.log('[fcm] Firebase Admin SDK initialised.');
  } catch (err) {
    console.error('[fcm] Firebase init failed:', err.message);
    messagingInstance = null;
  }
  return messagingInstance;
}

/**
 * Fetch all valid push tokens for a list of user IDs.
 * @param {number[]} userIds
 * @returns {Promise<Array<{user_id: number, token: string}>>}
 */
async function getTokensForUsers(userIds) {
  if (!userIds || userIds.length === 0) return [];
  const result = await db.query(
    `SELECT user_id, token FROM push_notification_tokens WHERE user_id = ANY($1::int[])`,
    [userIds]
  );
  return result.rows;
}

/**
 * Remove stale tokens that FCM rejected.
 * @param {string[]} tokens
 */
async function removeStaleTokens(tokens) {
  if (!tokens || tokens.length === 0) return;
  await db.query(
    `DELETE FROM push_notification_tokens WHERE token = ANY($1::text[])`,
    [tokens]
  );
}

/**
 * Check whether a notification was already delivered.
 * @param {number} userId
 * @param {string} notificationType  e.g. 'birthday', 'anniversary', 'event'
 * @param {string} referenceKey      e.g. 'birthday-42-2026-06-07'
 */
async function wasDelivered(userId, notificationType, referenceKey) {
  const result = await db.query(
    `SELECT 1 FROM notification_deliveries
     WHERE user_id = $1 AND notification_type = $2 AND reference_key = $3
     LIMIT 1`,
    [userId, notificationType, referenceKey]
  );
  return result.rowCount > 0;
}

/**
 * Mark a notification as delivered (deduplication).
 */
async function markDelivered(userId, notificationType, referenceKey) {
  await db.query(
    `INSERT INTO notification_deliveries (user_id, notification_type, reference_key)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, notification_type, reference_key) DO NOTHING`,
    [userId, notificationType, referenceKey]
  );
}

/**
 * Send a push notification to a single FCM token.
 * Returns true on success, false on failure (stale token, etc.).
 */
async function sendToToken(token, title, body, data = {}) {
  const messaging = getMessaging();
  if (!messaging) return false;

  try {
    await messaging.send({
      token,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      android: {
        priority: 'high',
        notification: {
          channelId: 'jagiris_notifications',
          sound: 'default',
        },
      },
    });
    return true;
  } catch (err) {
    const code = err.code || err.errorInfo?.code || '';
    if (
      code === 'messaging/registration-token-not-registered' ||
      code === 'messaging/invalid-registration-token'
    ) {
      await removeStaleTokens([token]);
    } else {
      console.error('[fcm] send error:', code, err.message);
    }
    return false;
  }
}

/**
 * Send a notification to all registered devices for a list of user IDs.
 * Handles deduplication via notification_deliveries.
 * @param {number[]} userIds
 * @param {string}   notificationType
 * @param {string}   referenceKey      Unique key per notification instance
 * @param {string}   title
 * @param {string}   body
 * @param {object}   [data]            Extra payload data
 * @returns {Promise<{sent: number, skipped: number, failed: number}>}
 */
async function sendToUsers(userIds, notificationType, referenceKey, title, body, data = {}) {
  const stats = { sent: 0, skipped: 0, failed: 0 };
  if (!getMessaging()) return stats;

  const tokens = await getTokensForUsers(userIds);
  if (tokens.length === 0) return stats;

  for (const { user_id, token } of tokens) {
    const delivered = await wasDelivered(user_id, notificationType, referenceKey);
    if (delivered) {
      stats.skipped++;
      continue;
    }
    const ok = await sendToToken(token, title, body, data);
    if (ok) {
      await markDelivered(user_id, notificationType, referenceKey);
      stats.sent++;
    } else {
      stats.failed++;
    }
  }
  return stats;
}

module.exports = {
  getMessaging,
  getTokensForUsers,
  removeStaleTokens,
  wasDelivered,
  markDelivered,
  sendToToken,
  sendToUsers,
};
