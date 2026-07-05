const db = require('../database/db');

/**
 * @param {number} userId
 * @param {number} familyId
 * @returns {Promise<Set<string>>}
 */
async function getDismissedFeedKeys(userId, familyId) {
  const result = await db.query(
    `SELECT reference_key FROM user_feed_dismissals
     WHERE user_id = $1 AND family_id = $2`,
    [userId, familyId]
  );
  return new Set(result.rows.map((r) => r.reference_key));
}

/**
 * @param {number} userId
 * @param {number} familyId
 * @param {string} referenceKey
 */
async function dismissFeedItem(userId, familyId, referenceKey) {
  if (!referenceKey) return;
  await db.query(
    `INSERT INTO user_feed_dismissals (user_id, family_id, reference_key)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, family_id, reference_key) DO NOTHING`,
    [userId, familyId, referenceKey]
  );
}

module.exports = { getDismissedFeedKeys, dismissFeedItem };
