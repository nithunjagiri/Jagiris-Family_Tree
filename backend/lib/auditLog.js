const db = require('../database/db');

/**
 * Best-effort audit row; never throws to callers.
 * @param {{ userId?: number|null; username?: string|null; action: string; entityType?: string|null; entityId?: number|null; summary?: string|null }} entry
 */
async function logAudit(entry) {
  try {
    await db.query(
      `INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, summary)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        entry.userId ?? null,
        entry.username ?? null,
        entry.action,
        entry.entityType ?? null,
        entry.entityId ?? null,
        entry.summary ?? null,
      ]
    );
  } catch (err) {
    console.error('[audit_logs]', err.message || err);
  }
}

module.exports = { logAudit };
