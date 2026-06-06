const db = require('../database/db');

function parseFamilyId(raw) {
  if (raw === undefined || raw === null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

async function getUserFamilies(userId) {
  const result = await db.query(
    `SELECT fm.family_id, fm.role, f.name
     FROM family_memberships fm
     JOIN families f ON f.id = fm.family_id
     WHERE fm.user_id = $1
     ORDER BY fm.family_id ASC`,
    [userId]
  );
  return result.rows;
}

async function createDefaultFamilyForUser(client, userId, username) {
  const familyName = username ? `${username}'s Family` : `Family ${userId}`;
  const familyInsert = await client.query(
    `INSERT INTO families (name, created_by)
     VALUES ($1, $2)
     RETURNING id`,
    [familyName, userId]
  );
  const familyId = familyInsert.rows[0].id;
  await client.query(
    `INSERT INTO family_memberships (user_id, family_id, role)
     VALUES ($1, $2, 'owner')
     ON CONFLICT (user_id, family_id) DO NOTHING`,
    [userId, familyId]
  );
  return familyId;
}

async function ensureUserHasDefaultFamily(userId, username) {
  const existing = await getUserFamilies(userId);
  if (existing.length > 0) return existing[0].family_id;

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const familyId = await createDefaultFamilyForUser(client, userId, username);
    await client.query('COMMIT');
    return familyId;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}
    throw err;
  } finally {
    client.release();
  }
}

async function attachMemberCounts(memberships) {
  const ids = memberships.map((m) => Number(m.family_id));
  if (ids.length === 0) return memberships.map((m) => ({ ...m, member_count: 0 }));
  const counts = await db.query(
    `SELECT family_id, COUNT(*)::int AS c
     FROM family_members
     WHERE family_id = ANY($1::int[])
     GROUP BY family_id`,
    [ids]
  );
  const countByFamily = new Map(counts.rows.map((r) => [Number(r.family_id), Number(r.c)]));
  return memberships.map((m) => ({
    ...m,
    member_count: countByFamily.get(Number(m.family_id)) || 0,
  }));
}

/** Prefer the shared archive: highest family_members count, then lowest family_id. */
function pickPrimaryFamily(enriched) {
  if (enriched.length === 0) return null;
  return enriched
    .slice()
    .sort((a, b) => {
      if (b.member_count !== a.member_count) return b.member_count - a.member_count;
      return Number(a.family_id) - Number(b.family_id);
    })[0];
}

async function resolveFamilyContext(req, res, next) {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Authentication required' });

    await ensureUserHasDefaultFamily(req.user.id, req.user.username);
    const memberships = await getUserFamilies(req.user.id);
    if (memberships.length === 0) {
      return res.status(403).json({ error: 'No family membership found for this account' });
    }

    const enriched = await attachMemberCounts(memberships);
    const primary = pickPrimaryFamily(enriched);
    const maxCount = primary ? primary.member_count : 0;

    const requestedFamilyId = parseFamilyId(req.headers['x-family-id']);
    let selected = enriched[0];
    if (requestedFamilyId) {
      const matched = enriched.find((m) => Number(m.family_id) === requestedFamilyId);
      if (!matched) {
        // Stale or invalid header (e.g. old localStorage): fall back to the primary shared workspace.
        selected = primary || enriched[0];
      } else if (enriched.length > 1 && matched.member_count < maxCount) {
        // Do not let a personal/small workspace hide the shared family tree when the user also belongs to a larger one.
        selected = primary;
      } else {
        selected = matched;
      }
    } else if (enriched.length > 1) {
      selected = primary;
    } else {
      selected = enriched[0];
    }

    req.familyId = Number(selected.family_id);
    req.familyRole = selected.role;
    req.familyName = selected.name;
    req.familyMemberships = enriched.map((m) => ({
      family_id: Number(m.family_id),
      role: m.role,
      name: m.name,
      member_count: m.member_count,
    }));
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  ensureUserHasDefaultFamily,
  getUserFamilies,
  resolveFamilyContext,
};
