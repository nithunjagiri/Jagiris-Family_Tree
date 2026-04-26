const db = require('../database/db');

/**
 * Builds hierarchical tree from flat family_members.
 * Root = oldest ancestor (no father_id/mother_id). Children = members linked to this node
 * or their spouse as father/mother (so one-parent links still group with the couple).
 * Includes spouse data for each node for frontend to render spouse connections.
 */
exports.get = async (req, res, next) => {
  try {
    const familyId = req.familyId;
    const result = await db.query(
      `SELECT id, name, surname, relation, date_of_birth, profile_photo, father_id, mother_id, spouse_id, gender, email, birth_place, occupation, notes, date_of_death, is_alive
       FROM family_members
       WHERE family_id = $1
       ORDER BY id`,
      [familyId]
    );
    const members = result.rows;
    const byId = new Map(members.map((m) => [m.id, m]));

    function fullName(m) {
      return [m.name, m.surname].filter(Boolean).join(' ') || m.name || 'Unknown';
    }

    /** YYYY-MM-DD for stable ordering (avoids timezone flips from Date parsing) */
    function dobCalendarKey(m) {
      if (!m.date_of_birth) return null;
      const s = String(m.date_of_birth).slice(0, 10);
      return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
    }

    /** Oldest sibling first (left in vertical tree); missing DOB last; tie-break by id */
    function sortMembersByBirthThenId(a, b) {
      const sa = dobCalendarKey(a);
      const sb = dobCalendarKey(b);
      if (sa == null && sb == null) return a.id - b.id;
      if (sa == null) return 1;
      if (sb == null) return -1;
      const c = sa.localeCompare(sb);
      if (c !== 0) return c;
      return a.id - b.id;
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
      const father = member.father_id ? byId.get(member.father_id) : null;
      const mother = member.mother_id ? byId.get(member.mother_id) : null;
      if (father || mother) {
        node.parent_names = [father ? fullName(father) : null, mother ? fullName(mother) : null]
          .filter(Boolean)
          .join(' & ');
      }
      const spouse = member.spouse_id ? byId.get(member.spouse_id) : null;
      if (spouse) {
        node.spouse = {
          id: spouse.id,
          name: fullName(spouse),
          profile_photo: spouse.profile_photo || null,
          date_of_birth: spouse.date_of_birth || null,
        };
      }
      const parentIds = new Set([member.id]);
      if (spouse) parentIds.add(spouse.id);
      const childIds = new Set();
      members.forEach((m) => {
        for (const pid of parentIds) {
          if (m.father_id == pid || m.mother_id == pid) {
            childIds.add(m.id);
            break;
          }
        }
      });
      const children = [...childIds].map((id) => byId.get(id)).filter(Boolean);
      if (children.length > 0) {
        const ordered = children.slice().sort(sortMembersByBirthThenId);
        node.children = ordered.map((c) => buildNode(c));
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
    let mainRoot = roots[0] || null;
    if (roots.length > 1) {
      let maxCount = 0;
      roots.forEach((r) => {
        const t = buildNode(r);
        const count = countNodes(t);
        if (count > maxCount) {
          maxCount = count;
          mainRoot = r;
        }
      });
    }
    const tree = mainRoot ? buildNode(mainRoot) : null;

    res.json({ tree });
  } catch (err) {
    next(err);
  }
};
