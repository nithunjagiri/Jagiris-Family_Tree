const db = require('../database/db');

/**
 * Resolve user IDs that should receive a family-scoped notification.
 * @param {number} familyId
 * @param {{ targetAudience?: 'all'|'admins', excludeUserId?: number|null }} options
 * @returns {Promise<number[]>}
 */
async function getFamilyRecipientUserIds(familyId, { targetAudience = 'all', excludeUserId = null } = {}) {
  if (!familyId) return [];

  let result;
  if (targetAudience === 'admins') {
    result = await db.query(
      `SELECT fm.user_id
       FROM family_memberships fm
       INNER JOIN users u ON u.id = fm.user_id AND u.is_admin = TRUE
       WHERE fm.family_id = $1::integer`,
      [Number(familyId)]
    );
  } else {
    result = await db.query(
      'SELECT user_id FROM family_memberships WHERE family_id = $1::integer',
      [Number(familyId)]
    );
  }

  return result.rows
    .map((r) => r.user_id)
    .filter((uid) => uid != null && uid !== excludeUserId);
}

module.exports = { getFamilyRecipientUserIds };
