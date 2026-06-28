import { isDeceased } from './dashboardAnalytics';
import { HIDE_RELATION_NAMES_IN_UI } from './appDisplaySettings';

/** @param {Record<string, unknown>} m */
export function getMemberPlaceLabels(m) {
  const out = [];
  for (const key of ['residence_place_name', 'residence_place', 'birth_place_name', 'birth_place']) {
    const v = m[key];
    if (v != null && String(v).trim()) out.push(String(v).trim());
  }
  return out;
}

/** @param {Array<Record<string, unknown>>} members */
export function getUniquePlaces(members) {
  const set = new Set();
  for (const m of members) {
    for (const p of getMemberPlaceLabels(m)) set.add(p);
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

/** @param {Array<Record<string, unknown>>} members */
export function getUniqueSurnames(members) {
  const set = new Set();
  for (const m of members) {
    const s = m.surname != null ? String(m.surname).trim() : '';
    if (s) set.add(s);
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

/**
 * @param {Array<Record<string, unknown>>} members
 * @param {{
 *   surname?: string;
 *   place?: string;
 *   gender?: string;
 *   status?: string;
 *   searchQuery?: string;
 * }} filters
 */
export function filterMembers(members, filters = {}) {
  const { surname = '', place = '', gender = '', status = '', searchQuery = '' } = filters;
  let result = members;

  if (status === 'living') {
    result = result.filter((m) => !isDeceased(m));
  } else if (status === 'deceased') {
    result = result.filter((m) => isDeceased(m));
  }

  if (surname) {
    result = result.filter((m) => String(m.surname || '').trim() === surname);
  }

  if (place) {
    result = result.filter((m) => getMemberPlaceLabels(m).includes(place));
  }

  if (gender) {
    result = result.filter((m) => String(m.gender || '').trim() === gender);
  }

  const q = searchQuery.trim().toLowerCase();
  if (q) {
    result = result.filter((m) => {
      const parts = [m.name, m.surname, m.phone, m.whatsapp_number];
      if (!HIDE_RELATION_NAMES_IN_UI && m.relation) parts.push(m.relation);
      parts.push(...getMemberPlaceLabels(m));
      const hay = parts.filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }

  return result;
}

/** @param {{ surname?: string; place?: string; gender?: string; status?: string; searchQuery?: string }} filters */
export function hasActiveMemberFilters(filters) {
  return Boolean(
    filters.surname ||
      filters.place ||
      filters.gender ||
      filters.status ||
      (filters.searchQuery && filters.searchQuery.trim())
  );
}
