import { parseCalendarYmd, todayYmdInTimeZone, addCalendarDays } from './calendarDate';

/** @param {string | null | undefined} dateStr */
export function yearFromDate(dateStr) {
  const p = parseCalendarYmd(dateStr);
  if (!p || p.y < 1000 || p.y > 9999) return null;
  return p.y;
}

/** @param {Record<string, unknown>} m */
export function isDeceased(m) {
  const dod = m.date_of_death;
  if (dod != null && String(dod).trim() !== '') return true;
  const alive = m.is_alive;
  if (alive === false || alive === 0) return true;
  if (typeof alive === 'string' && alive.trim().toLowerCase() === 'no') return true;
  return false;
}

/**
 * @param {Array<Record<string, unknown>>} members
 * @returns {{ label: string; decade: number; count: number }[]}
 */
export function birthsByDecade(members) {
  const counts = new Map();
  for (const m of members) {
    const y = yearFromDate(m.date_of_birth);
    if (y == null) continue;
    const decade = Math.floor(y / 10) * 10;
    counts.set(decade, (counts.get(decade) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([decade, count]) => ({
      label: `${decade}s`,
      decade,
      count,
    }));
}

/**
 * @param {Array<Record<string, unknown>>} members
 * @returns {{ year: number; count: number }[]}
 */
export function deathsByYear(members) {
  const counts = new Map();
  for (const m of members) {
    if (!isDeceased(m)) continue;
    const y = yearFromDate(m.date_of_death);
    if (y == null) continue;
    counts.set(y, (counts.get(y) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, count]) => ({ year, count }));
}

/**
 * @param {Array<Record<string, unknown>>} members
 * @returns {{ name: string; value: number }[]}
 */
export function genderSlices(members) {
  let male = 0;
  let female = 0;
  let other = 0;
  let unknown = 0;
  for (const m of members) {
    const g = String(m.gender || '').trim();
    if (g === 'Male') male += 1;
    else if (g === 'Female') female += 1;
    else if (g === 'Other') other += 1;
    else unknown += 1;
  }
  return [
    { name: 'Male', value: male, key: 'male' },
    { name: 'Female', value: female, key: 'female' },
    { name: 'Other', value: other, key: 'other' },
    { name: 'Not set', value: unknown, key: 'unknown' },
  ].filter((s) => s.value > 0);
}

/**
 * @param {Array<Record<string, unknown>>} members
 */
export function livingCounts(members) {
  let living = 0;
  let deceased = 0;
  for (const m of members) {
    if (isDeceased(m)) deceased += 1;
    else living += 1;
  }
  return { living, deceased };
}

/**
 * Members with a recurring month-day date in the next `withinDays` days (IST), excluding deceased.
 * @param {Array<Record<string, unknown>>} members
 * @param {string} dateField
 * @param {number} withinDays
 * @returns {{ member: Record<string, unknown>; nextYmd: string }[]}
 */
function upcomingByMonthDay(members, dateField, withinDays = 60) {
  const todayYmd = todayYmdInTimeZone('Asia/Kolkata');
  const endYmd = addCalendarDays(todayYmd, withinDays);
  if (!todayYmd || !endYmd) return [];

  const ty = parseInt(todayYmd.slice(0, 4), 10);
  const out = [];
  for (const m of members) {
    if (isDeceased(m)) continue;
    const p = parseCalendarYmd(m[dateField]);
    if (!p) continue;
    const md = p.ymd.slice(5);
    let nextYmd = `${ty}-${md}`;
    if (nextYmd < todayYmd) nextYmd = `${ty + 1}-${md}`;
    if (nextYmd >= todayYmd && nextYmd <= endYmd) {
      out.push({ member: m, nextYmd });
    }
  }
  out.sort((a, b) => a.nextYmd.localeCompare(b.nextYmd));
  return out;
}

/**
 * Members with DOB in the next `withinDays` days (calendar in Asia/Kolkata), excluding deceased.
 * @param {Array<Record<string, unknown>>} members
 * @param {number} withinDays
 * @returns {{ member: Record<string, unknown>; nextYmd: string }[]}
 */
export function upcomingBirthdays(members, withinDays = 60) {
  return upcomingByMonthDay(members, 'date_of_birth', withinDays);
}

/**
 * @param {Array<Record<string, unknown>>} members
 * @param {number} withinDays
 * @returns {{ member: Record<string, unknown>; nextYmd: string }[]}
 */
export function upcomingAnniversaries(members, withinDays = 60) {
  return upcomingByMonthDay(members, 'anniversary_date', withinDays);
}

/**
 * @param {Array<Record<string, unknown>>} members
 * @param {number} withinDays
 * @returns {{ key: string; type: 'birthday' | 'anniversary'; member: Record<string, unknown>; nextYmd: string; title: string }[]}
 */
export function upcomingFamilyDates(members, withinDays = 60) {
  const displayName = (m) => [m.name, m.surname].filter(Boolean).join(' ') || m.name || 'Member';
  const birthdays = upcomingBirthdays(members, withinDays).map(({ member, nextYmd }) => ({
    key: `b-${member.id}-${nextYmd}`,
    type: 'birthday',
    member,
    nextYmd,
    title: displayName(member),
  }));
  const anniversaries = upcomingAnniversaries(members, withinDays).map(({ member, nextYmd }) => ({
    key: `a-${member.id}-${nextYmd}`,
    type: 'anniversary',
    member,
    nextYmd,
    title: displayName(member),
  }));
  return [...birthdays, ...anniversaries].sort(
    (a, b) => a.nextYmd.localeCompare(b.nextYmd) || a.title.localeCompare(b.title)
  );
}

/**
 * Birth counts for the most recent `maxBars` calendar years that have at least one birth.
 * @param {Array<Record<string, unknown>>} members
 * @param {number} maxBars
 */
export function birthsByYearRecent(members, maxBars = 24) {
  const counts = new Map();
  for (const m of members) {
    const y = yearFromDate(m.date_of_birth);
    if (y == null) continue;
    counts.set(y, (counts.get(y) || 0) + 1);
  }
  if (counts.size === 0) return [];
  const yearsDesc = [...counts.keys()].sort((a, b) => b - a);
  const picked = yearsDesc.slice(0, maxBars).sort((a, b) => a - b);
  return picked.map((year) => ({ year: String(year), count: counts.get(year) || 0 }));
}

const BLOOD_GROUP_ORDER = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

function normalizeBloodGroup(raw) {
  const v = String(raw || '').trim().toUpperCase();
  if (!v) return '';
  if (BLOOD_GROUP_ORDER.includes(v)) return v;
  return v;
}

/**
 * Blood-group counts with member mapping for drill-down.
 * @param {Array<Record<string, unknown>>} members
 * @returns {{ chartData: { group: string; count: number }[]; membersByGroup: Record<string, Record<string, unknown>[]>; totalWithBloodGroup: number; }}
 */
export function bloodGroupBreakdown(members) {
  const membersByGroup = {};
  let totalWithBloodGroup = 0;

  for (const m of members) {
    const group = normalizeBloodGroup(m.blood_group);
    if (!group) continue;
    totalWithBloodGroup += 1;
    if (!membersByGroup[group]) membersByGroup[group] = [];
    membersByGroup[group].push(m);
  }

  const dynamicGroups = Object.keys(membersByGroup).filter((g) => !BLOOD_GROUP_ORDER.includes(g)).sort();
  const orderedGroups = [...BLOOD_GROUP_ORDER, ...dynamicGroups].filter((g) => membersByGroup[g]?.length > 0);

  const chartData = orderedGroups.map((group) => ({
    group,
    count: membersByGroup[group].length,
  }));

  return { chartData, membersByGroup, totalWithBloodGroup };
}
