const db = require('../database/db');
const { ensurePlacesAuditSchema } = require('../database/ensurePlacesAuditSchema');

async function selectAuditPage(limit, offset) {
  return db.query(
    `SELECT id, user_id, username, action, entity_type, entity_id, summary, created_at
     FROM audit_logs
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
}

exports.listAuditLogs = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    let result;
    try {
      result = await selectAuditPage(limit, offset);
    } catch (e) {
      if (e.code === '42P01') {
        try {
          await ensurePlacesAuditSchema();
          result = await selectAuditPage(limit, offset);
        } catch (e2) {
          return res.json({
            items: [],
            total: 0,
            message:
              'Could not create or read audit_logs. Check database connection and server logs (schema ensure runs on startup and was retried here).',
          });
        }
      } else throw e;
    }

    let countRow = { rows: [{ c: '0' }] };
    try {
      countRow = await db.query('SELECT COUNT(*)::bigint AS c FROM audit_logs');
    } catch (e) {
      if (e.code === '42P01') {
        try {
          await ensurePlacesAuditSchema();
          countRow = await db.query('SELECT COUNT(*)::bigint AS c FROM audit_logs');
        } catch (_) {}
      }
    }

    res.json({
      items: result.rows,
      total: Number(countRow.rows[0]?.c || 0),
      limit,
      offset,
    });
  } catch (err) {
    next(err);
  }
};
