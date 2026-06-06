const db = require('../database/db');

exports.search = async (req, res, next) => {
  try {
    const familyId = req.familyId;
    const raw = (req.query.q || '').trim();
    if (!raw) {
      return res.json({ members: [], events: [], photos: [], query: '' });
    }
    const escaped = raw.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
    const term = `%${escaped}%`;

    const [members, events, photos] = await Promise.all([
      db.query(
        `SELECT fm.id, fm.name, fm.surname, fm.relation, fm.birth_place, fm.notes, p.name AS birth_place_name
         FROM family_members fm
         LEFT JOIN places p ON p.id = fm.birth_place_id AND p.family_id = fm.family_id
         WHERE fm.family_id = $2
           AND (fm.name ILIKE $1 ESCAPE '\\' OR fm.surname ILIKE $1 ESCAPE '\\' OR fm.relation ILIKE $1 ESCAPE '\\'
           OR fm.birth_place ILIKE $1 ESCAPE '\\' OR COALESCE(p.name, '') ILIKE $1 ESCAPE '\\'
           OR fm.notes ILIKE $1 ESCAPE '\\' OR COALESCE(fm.educational_qualification, '') ILIKE $1 ESCAPE '\\')
         ORDER BY fm.name ASC NULLS LAST
         LIMIT 25`,
        [term, familyId]
      ),
      db.query(
        `SELECT id, title, event_date, LEFT(description, 120) AS description_preview
         FROM events
         WHERE family_id = $2
           AND (title ILIKE $1 ESCAPE '\\' OR COALESCE(description, '') ILIKE $1 ESCAPE '\\')
         ORDER BY event_date DESC
         LIMIT 15`,
        [term, familyId]
      ),
      db.query(
        `SELECT id, title, image_path, uploaded_at
         FROM photos
         WHERE family_id = $2
           AND title ILIKE $1 ESCAPE '\\'
         ORDER BY uploaded_at DESC
         LIMIT 15`,
        [term, familyId]
      ),
    ]);

    res.json({
      query: raw,
      members: members.rows,
      events: events.rows,
      photos: photos.rows,
    });
  } catch (err) {
    next(err);
  }
};
