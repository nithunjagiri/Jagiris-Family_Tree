/** Canonical relation values stored in DB (display text matches value). */
export const RELATION_OTHERS_VALUE = 'Others';

const RELATION_CANONICAL = [
  'Self',
  'Spouse',
  'Husband',
  'Wife',
  'Son',
  'Daughter',
  'Father',
  'Mother',
  'Brother',
  'Sister',
  'Grandfather',
  'Grandmother',
  'Grandson',
  'Granddaughter',
  'Uncle',
  'Aunt',
  'Nephew',
  'Niece',
  'Cousin',
  'Brother-in-law',
  'Sister-in-law',
  'Father-in-law',
  'Mother-in-law',
  'Son-in-law',
  'Daughter-in-law',
  RELATION_OTHERS_VALUE,
];

const canonicalLower = new Map(
  RELATION_CANONICAL.map((v) => [v.trim().toLowerCase(), v])
);

/**
 * @param {string} selectValue dropdown value (empty = none)
 * @param {string} otherText when select is Others
 * @returns {string | null}
 */
export function resolveRelationForPayload(selectValue, otherText) {
  const sel = String(selectValue ?? '').trim();
  if (!sel) return null;
  if (sel === RELATION_OTHERS_VALUE) {
    const manual = String(otherText ?? '').trim();
    return manual || RELATION_OTHERS_VALUE;
  }
  return sel;
}

/**
 * Map stored DB value to dropdown + optional "specify" field for edit mode.
 * @param {string | null | undefined} stored
 * @returns {{ relationSelect: string; relationOtherText: string }}
 */
export function splitStoredRelation(stored) {
  if (stored == null || String(stored).trim() === '') {
    return { relationSelect: '', relationOtherText: '' };
  }
  const raw = String(stored).trim();
  const key = raw.toLowerCase();
  const canonical = canonicalLower.get(key);
  if (canonical) {
    return { relationSelect: canonical, relationOtherText: '' };
  }
  return { relationSelect: RELATION_OTHERS_VALUE, relationOtherText: raw };
}

export function getRelationSelectOptions() {
  return RELATION_CANONICAL.filter((v) => v !== RELATION_OTHERS_VALUE);
}
