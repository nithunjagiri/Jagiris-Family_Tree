const db = require('../database/db');

/**
 * Builds hierarchical tree from flat family_members using father_id.
 * Root = oldest ancestor (no father_id). Children = members where father_id = node.id.
 * Includes spouse data for each node for frontend to render spouse connections.
 */
exports.get = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, name, surname, relation, date_of_birth, profile_photo, father_id, mother_id, spouse_id, gender, email, birth_place, occupation, notes, date_of_death
       FROM family_members ORDER BY id`
    );
    const members = result.rows;
    const byId = new Map(members.map((m) => [m.id, m]));

    function fullName(m) {
      return [m.name, m.surname].filter(Boolean).join(' ') || m.name || 'Unknown';
    }

    function buildNode(member) {
      const node = {
        id: member.id,
        name: fullName(member),
        profile_photo: member.profile_photo || null,
        date_of_birth: member.date_of_birth || null,
        gender: member.gender || null,
        father_id: member.father_id || null,
        mother_id: member.mother_id || null,
        spouse_id: member.spouse_id || null,
      };
      const spouse = member.spouse_id ? byId.get(member.spouse_id) : null;
      if (spouse) {
        node.spouse = {
          id: spouse.id,
          name: fullName(spouse),
          profile_photo: spouse.profile_photo || null,
          date_of_birth: spouse.date_of_birth || null,
        };
      }
      const childIds = new Set();
      members.forEach((m) => {
        if (m.father_id == member.id || m.mother_id == member.id) childIds.add(m.id);
      });
      const children = [...childIds].map((id) => byId.get(id)).filter(Boolean);
      if (children.length > 0) {
        node.children = children.map((c) => buildNode(c));
      }
      return node;
    }

    function countNodes(node) {
      let n = 1;
      if (node.spouse) n += 1;
      if (node.children) node.children.forEach((c) => { n += countNodes(c); });
      return n;
    }

    const roots = members.filter((m) => m.father_id == null && m.mother_id == null);
    roots.sort((a, b) => a.id - b.id);
    let root = roots[0] || null;
    if (roots.length > 1) {
      let maxCount = 0;
      roots.forEach((r) => {
        const t = buildNode(r);
        const count = countNodes(t);
        if (count > maxCount) {
          maxCount = count;
          root = r;
        }
      });
    }
    const tree = root ? buildNode(root) : null;

    res.json({ tree });
  } catch (err) {
    next(err);
  }
};
