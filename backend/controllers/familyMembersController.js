const db = require('../database/db');
const { body, validationResult } = require('express-validator');
const { logAudit } = require('../lib/auditLog');

const COLS =
  'fm.id, fm.family_id, fm.name, fm.surname, fm.relation, fm.date_of_birth, fm.phone, fm.whatsapp_number, fm.profile_photo, fm.father_id, fm.mother_id, fm.spouse_id, fm.gender, fm.email, fm.birth_place, fm.birth_place_id, fm.residence_place_id, fm.residence_place, fm.created_by, fm.updated_by, fm.occupation, fm.notes, fm.date_of_death, fm.is_alive, fm.education_level, fm.educational_qualification, fm.marital_status, fm.anniversary_date, fm.blood_group, fm.emergency_contact_name, fm.emergency_contact_phone, fm.privacy_level, fm.preferred_language, fm.biography, fm.instagram_id, fm.facebook_id, fm.created_at, fm.updated_at, pb.name AS birth_place_name, rp.name AS residence_place_name, uc.username AS created_by_username, uu.username AS updated_by_username';

function normalizeIsAlive(body) {
  const raw = body?.is_alive;
  if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
    const t = String(raw).trim().toLowerCase();
    if (t === 'yes' || t === 'true' || t === '1') return 'Yes';
    if (t === 'no' || t === 'false' || t === '0') return 'No';
  }
  if (raw === false || raw === 0) return 'No';
  if (raw === true || raw === 1) return 'Yes';
  const dod = body?.date_of_death;
  if (dod != null && String(dod).trim() !== '') return 'No';
  return 'Yes';
}

exports.validateMember = [
  body('name').trim().notEmpty().withMessage('Name required'),
  body('surname').optional().trim(),
  body('relation').optional().trim(),
  body('date_of_birth').optional().trim(),
  body('phone').optional().trim(),
  body('whatsapp_number').optional().trim(),
  body('gender')
    .trim()
    .notEmpty()
    .withMessage('Gender required')
    .isIn(['Male', 'Female', 'Other'])
    .withMessage('Gender must be Male, Female, or Other'),
  body('email').optional({ checkFalsy: true }).trim().isEmail().withMessage('Valid email if provided'),
  body('birth_place').optional().trim(),
  body('birth_place_id').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('Invalid birth_place_id').toInt(),
  body('residence_place_id').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('Invalid residence_place_id').toInt(),
  body('residence_place').optional().trim(),
  body('occupation').optional().trim(),
  body('notes').optional().trim(),
  body('education_level').optional().trim(),
  body('educational_qualification').optional().trim(),
  body('marital_status')
    .optional({ checkFalsy: true })
    .isIn(['single', 'married', 'widowed', 'divorced', 'separated', 'other'])
    .withMessage('Invalid marital_status'),
  body('anniversary_date').optional().trim(),
  body('blood_group').optional().trim(),
  body('emergency_contact_name').optional().trim(),
  body('emergency_contact_phone').optional().trim(),
  body('privacy_level')
    .optional({ checkFalsy: true })
    .isIn(['public', 'family', 'admin_only'])
    .withMessage('Invalid privacy_level'),
  body('preferred_language').optional().trim(),
  body('biography').optional().trim(),
  body('instagram_id').optional().trim(),
  body('facebook_id').optional().trim(),
  body('date_of_death').optional().trim(),
  body('father_id').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('Invalid father_id').toInt(),
  body('mother_id').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('Invalid mother_id').toInt(),
  body('spouse_id').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('Invalid spouse_id').toInt(),
];

async function selectMemberById(clientOrDb, id, familyId) {
  const result = await clientOrDb.query(
    `SELECT ${COLS}
     FROM family_members fm
     LEFT JOIN places pb ON pb.id::text = NULLIF(TRIM(fm.birth_place_id::text), '') AND pb.family_id = fm.family_id
     LEFT JOIN places rp ON rp.id::text = NULLIF(TRIM(fm.residence_place_id::text), '') AND rp.family_id = fm.family_id
     LEFT JOIN users uc ON uc.id::text = NULLIF(TRIM(fm.created_by::text), '')
     LEFT JOIN users uu ON uu.id::text = NULLIF(TRIM(fm.updated_by::text), '')
     WHERE fm.id = $1 AND fm.family_id = $2`,
    [id, familyId]
  );
  return result.rows[0] || null;
}

async function assertLinkedMemberInFamily(client, linkedId, familyId, label, memberId) {
  if (linkedId == null) return;
  if (memberId != null && Number(linkedId) === Number(memberId)) {
    throw new Error(`${label} cannot reference the same member`);
  }
  const check = await client.query(
    'SELECT id FROM family_members WHERE id = $1 AND family_id = $2',
    [linkedId, familyId]
  );
  if (!check.rows[0]) {
    throw new Error(`${label} must reference a member in the same family`);
  }
}

async function validateFamilyRelations(client, { familyId, memberId, fatherId, motherId, spouseId }) {
  await assertLinkedMemberInFamily(client, fatherId, familyId, 'father_id', memberId);
  await assertLinkedMemberInFamily(client, motherId, familyId, 'mother_id', memberId);
  await assertLinkedMemberInFamily(client, spouseId, familyId, 'spouse_id', memberId);
}

exports.list = async (req, res, next) => {
  try {
    const familyId = req.familyId;

    const result = await db.query(
      `SELECT ${COLS}
       FROM family_members fm
       LEFT JOIN places pb ON pb.id::text = NULLIF(TRIM(fm.birth_place_id::text), '') AND pb.family_id = fm.family_id
       LEFT JOIN places rp ON rp.id::text = NULLIF(TRIM(fm.residence_place_id::text), '') AND rp.family_id = fm.family_id
       LEFT JOIN users uc ON uc.id::text = NULLIF(TRIM(fm.created_by::text), '')
       LEFT JOIN users uu ON uu.id::text = NULLIF(TRIM(fm.updated_by::text), '')
       WHERE fm.family_id = $1
       ORDER BY fm.name, fm.surname NULLS LAST, fm.id`,
      [familyId]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};


exports.get = async (req, res, next) => {
  try {
    const row = await selectMemberById(db, req.params.id, req.familyId);
    if (!row) return res.status(404).json({ error: 'Family member not found' });
    res.json(row);
  } catch (err) {
    next(err);
  }
};

function toNum(v) {
  if (v === '' || v === undefined || v === null) return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

/**
 * Keep spouse_id symmetric: when memberId's spouse is newSpouseId, newSpouseId's spouse_id points back.
 * Clears the previous spouse's back-link when spouse_id changes or is removed.
 */
async function syncSpouseBidirectional(client, familyId, memberId, newSpouseId, prevSpouseId) {
  const mid = Number(memberId);
  const next = newSpouseId != null ? Number(newSpouseId) : null;
  const prev = prevSpouseId != null ? Number(prevSpouseId) : null;

  if (prev && prev !== next) {
    await client.query(
      `UPDATE family_members
       SET spouse_id = NULL, updated_at = NOW()
       WHERE id = $1 AND spouse_id = $2 AND family_id = $3`,
      [prev, mid, familyId]
    );
  }
  if (next && next !== mid) {
    await client.query(
      `UPDATE family_members
       SET spouse_id = $1, updated_at = NOW()
       WHERE id = $2 AND family_id = $3`,
      [mid, next, familyId]
    );
  }
}

exports.create = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const client = await db.connect();
  try {
    const profile_photo = req.file ? `/uploads/profiles/${req.file.filename}` : null;
    const {
      name, surname, relation, date_of_birth, phone, whatsapp_number, gender, email, birth_place,
      birth_place_id, residence_place_id, occupation, notes, date_of_death, father_id, mother_id, spouse_id,
      residence_place,
      education_level, educational_qualification, marital_status, anniversary_date,
      blood_group, emergency_contact_name, emergency_contact_phone, privacy_level,
      preferred_language, biography, instagram_id, facebook_id,
    } = req.body;
    const is_alive = normalizeIsAlive(req.body);
    const sid = toNum(spouse_id);
    const fid = toNum(father_id);
    const mid = toNum(mother_id);
    const birthPlaceId = toNum(birth_place_id);
    const residencePlaceId = toNum(residence_place_id);
    const actorId = req.user?.id ?? null;
    const familyId = req.familyId;

    await client.query('BEGIN');
    await validateFamilyRelations(client, { familyId, memberId: null, fatherId: fid, motherId: mid, spouseId: sid });
    const result = await client.query(
      `INSERT INTO family_members (
        family_id,
        name, surname, relation, date_of_birth, phone, whatsapp_number, profile_photo,
        father_id, mother_id, spouse_id, gender, email, birth_place, birth_place_id, residence_place_id, residence_place, created_by, updated_by,
        occupation, notes, date_of_death, is_alive, education_level, educational_qualification,
        marital_status, anniversary_date, blood_group, emergency_contact_name, emergency_contact_phone,
        privacy_level, preferred_language, biography, instagram_id, facebook_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35)
      RETURNING id`,
      [
        familyId,
        name, surname || null, relation || null, date_of_birth || null, phone || null, whatsapp_number || null, profile_photo,
        fid, mid, sid, gender || null, email || null,
        birth_place || null, birthPlaceId, residencePlaceId, residence_place || null, actorId, actorId, occupation || null, notes || null, date_of_death || null, is_alive,
        education_level || null, educational_qualification || null, marital_status || null, anniversary_date || null,
        blood_group || null, emergency_contact_name || null, emergency_contact_phone || null, privacy_level || null,
        preferred_language || null, biography || null, instagram_id || null, facebook_id || null,
      ]
    );
    const memberId = result.rows[0].id;
    await syncSpouseBidirectional(client, familyId, memberId, sid, null);
    await client.query('COMMIT');
    const row = await selectMemberById(db, memberId, familyId);
    await logAudit({
      userId: req.user?.id,
      username: req.user?.username,
      action: 'member.create',
      entityType: 'family_member',
      entityId: memberId,
      summary: `${name} ${surname || ''}`.trim(),
    });
    res.status(201).json(row);
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}
    next(err);
  } finally {
    client.release();
  }
};

exports.update = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const familyId = req.familyId;
    const existing = await client.query(
      'SELECT profile_photo, spouse_id FROM family_members WHERE id = $1 AND family_id = $2 FOR UPDATE',
      [req.params.id, familyId]
    );
    if (!existing.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Family member not found' });
    }
    const profile_photo = req.file ? `/uploads/profiles/${req.file.filename}` : existing.rows[0].profile_photo;
    const prevSpouse = toNum(existing.rows[0].spouse_id);

    const {
      name, surname, relation, date_of_birth, phone, whatsapp_number, gender, email, birth_place,
      birth_place_id, residence_place_id, occupation, notes, date_of_death, father_id, mother_id, spouse_id,
      residence_place,
      education_level, educational_qualification, marital_status, anniversary_date,
      blood_group, emergency_contact_name, emergency_contact_phone, privacy_level,
      preferred_language, biography, instagram_id, facebook_id,
    } = req.body;
    const is_alive = normalizeIsAlive(req.body);
    const fid = toNum(father_id);
    const mid = toNum(mother_id);
    const newSid = toNum(spouse_id);
    const birthPlaceId = toNum(birth_place_id);
    const residencePlaceId = toNum(residence_place_id);
    const actorId = req.user?.id ?? null;
    await validateFamilyRelations(client, {
      familyId,
      memberId: req.params.id,
      fatherId: fid,
      motherId: mid,
      spouseId: newSid,
    });

    await client.query(
      `UPDATE family_members SET
        name = $1, surname = $2, relation = $3, date_of_birth = $4, phone = $5, whatsapp_number = $6, profile_photo = $7,
        father_id = $8, mother_id = $9, spouse_id = $10, gender = $11, email = $12,
        birth_place = $13, birth_place_id = $14, residence_place_id = $15, residence_place = $16, occupation = $17, notes = $18,
        date_of_death = $19, is_alive = $20, education_level = $21, educational_qualification = $22,
        marital_status = $23, anniversary_date = $24, blood_group = $25, emergency_contact_name = $26,
        emergency_contact_phone = $27, privacy_level = $28, preferred_language = $29, biography = $30,
        instagram_id = $31, facebook_id = $32, updated_by = $33, updated_at = NOW()
      WHERE id = $34 AND family_id = $35`,
      [
        name, surname || null, relation || null, date_of_birth || null, phone || null, whatsapp_number || null, profile_photo,
        fid, mid, newSid, gender || null, email || null,
        birth_place || null, birthPlaceId, residencePlaceId, residence_place || null, occupation || null, notes || null, date_of_death || null,
        is_alive, education_level || null, educational_qualification || null, marital_status || null, anniversary_date || null,
        blood_group || null, emergency_contact_name || null, emergency_contact_phone || null, privacy_level || null,
        preferred_language || null, biography || null, instagram_id || null, facebook_id || null, actorId, req.params.id, familyId,
      ]
    );
    await syncSpouseBidirectional(client, familyId, req.params.id, newSid, prevSpouse);
    await client.query('COMMIT');
    await logAudit({
      userId: req.user?.id,
      username: req.user?.username,
      action: 'member.update',
      entityType: 'family_member',
      entityId: Number(req.params.id),
      summary: `${name} ${surname || ''}`.trim(),
    });
    const row = await selectMemberById(db, req.params.id, familyId);
    res.json(row);
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}
    next(err);
  } finally {
    client.release();
  }
};

exports.remove = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const familyId = req.familyId;
    await db.query(
      'UPDATE family_members SET spouse_id = NULL, updated_at = NOW() WHERE spouse_id = $1 AND family_id = $2',
      [id, familyId]
    );
    const result = await db.query('DELETE FROM family_members WHERE id = $1 AND family_id = $2 RETURNING id', [id, familyId]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Family member not found' });
    await logAudit({
      userId: req.user?.id,
      username: req.user?.username,
      action: 'member.delete',
      entityType: 'family_member',
      entityId: id,
      summary: `Deleted member id ${id}`,
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
