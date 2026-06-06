/**
 * Calendar-only dates (YYYY-MM-DD) aligned with PostgreSQL DATE — no timezone shifting.
 * "Today" windows for birthdays use Asia/Kolkata (IST) as requested.
 */

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** @param {unknown} value */
export function parseCalendarYmd(value) {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  const plain = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (plain) {
    const y = Number(plain[1]);
    const mo = Number(plain[2]);
    const d = Number(plain[3]);
    if (!Number.isFinite(y) || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    const ymd = `${plain[1]}-${plain[2]}-${plain[3]}`;
    return { y, m: mo, d, ymd };
  }
  if (s.includes('T')) {
    const inst = new Date(s);
    if (Number.isNaN(inst.getTime())) return null;
    const ymd = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(inst);
    return parseCalendarYmd(ymd);
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:\b|$)/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const ymd = `${m[1]}-${m[2]}-${m[3]}`;
  return { y, m: mo, d, ymd };
}

/** e.g. Jul 20 */
export function formatCalendarShort(value) {
  const p = parseCalendarYmd(value);
  if (!p) return '';
  return `${MONTH_SHORT[p.m - 1]} ${p.d}`;
}

/** e.g. Jul 20, 2024 */
export function formatCalendarLong(value) {
  const p = parseCalendarYmd(value);
  if (!p) return '';
  return `${MONTH_SHORT[p.m - 1]} ${p.d}, ${p.y}`;
}

/** Current calendar date in `timeZone` as YYYY-MM-DD */
export function todayYmdInTimeZone(timeZone = 'Asia/Kolkata') {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Add days to a calendar YYYY-MM-DD using UTC noon to avoid DST edges */
export function addCalendarDays(ymd, days) {
  const p = parseCalendarYmd(ymd);
  if (!p || !Number.isFinite(days)) return null;
  const ms = Date.UTC(p.y, p.m - 1, p.d, 12, 0, 0) + days * 86400000;
  const u = new Date(ms);
  const y = u.getUTCFullYear();
  const mo = String(u.getUTCMonth() + 1).padStart(2, '0');
  const d = String(u.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

/**
 * @param {unknown} value
 * @returns {{ monthShort: string; day: number; year: number; weekdayLong: string } | null}
 */
export function eventCalendarParts(value) {
  const p = parseCalendarYmd(value);
  if (!p) return null;
  const utcNoon = Date.UTC(p.y, p.m - 1, p.d, 12, 0, 0);
  const weekdayLong = new Date(utcNoon).toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'UTC' });
  return { monthShort: MONTH_SHORT[p.m - 1], day: p.d, year: p.y, weekdayLong };
}
