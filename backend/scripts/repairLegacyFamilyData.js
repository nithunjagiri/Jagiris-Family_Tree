const db = require('../database/db');

async function run() {
  const owner = await db.query(
    "SELECT id FROM users ORDER BY (username = 'nithun') DESC, id ASC LIMIT 1"
  );
  const ownerId = owner.rows[0]?.id;
  if (!ownerId) throw new Error('No users found');

  const ownerFamily = await db.query(
    'SELECT family_id FROM family_memberships WHERE user_id = $1 ORDER BY family_id ASC LIMIT 1',
    [ownerId]
  );
  const familyId = ownerFamily.rows[0]?.family_id;
  if (!familyId) throw new Error('Owner family not found');

  await db.query('UPDATE family_members SET family_id = $1 WHERE family_id IS NULL', [familyId]);
  await db.query('UPDATE events SET family_id = $1 WHERE family_id IS NULL', [familyId]);
  await db.query('UPDATE photos SET family_id = $1 WHERE family_id IS NULL', [familyId]);
  await db.query('UPDATE places SET family_id = $1 WHERE family_id IS NULL', [familyId]);
  await db.query(
    `INSERT INTO family_memberships (user_id, family_id, role)
     SELECT id, $1, CASE WHEN id = $2 THEN 'owner' ELSE 'member' END
     FROM users
     ON CONFLICT (user_id, family_id) DO NOTHING`,
    [familyId, ownerId]
  );

  const counts = await db.query(
    'SELECT family_id, COUNT(*)::int AS c FROM family_members GROUP BY family_id ORDER BY family_id'
  );
  const memberships = await db.query(
    'SELECT user_id, family_id, role FROM family_memberships ORDER BY family_id, user_id'
  );
  console.log(
    JSON.stringify(
      {
        ownerId,
        familyId,
        memberCounts: counts.rows,
        memberships: memberships.rows,
      },
      null,
      2
    )
  );
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
