/**
 * Calendar-only dates (YYYY-MM-DD) aligned with PostgreSQL DATE — no timezone shifting.
 * Scheduled notifications use Asia/Kolkata (IST) for "today" / "tomorrow" windows.
 */

const DEFAULT_TZ = 'Asia/Kolkata';

/** Current calendar date in `timeZone` as YYYY-MM-DD */
function todayYmdInTimeZone(timeZone = DEFAULT_TZ) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Add days to a calendar YYYY-MM-DD using UTC noon to avoid DST edges */
function addCalendarDays(ymd, days) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd).trim());
  if (!m || !Number.isFinite(days)) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const ms = Date.UTC(y, mo - 1, d, 12, 0, 0) + days * 86400000;
  const u = new Date(ms);
  const yy = u.getUTCFullYear();
  const mm = String(u.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(u.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** Normalize PostgreSQL DATE / ISO strings to YYYY-MM-DD without UTC shift */
function normalizeCalendarYmd(value) {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  const plain = /^(\d{4}-\d{2}-\d{2})(?:\b|T|$)/.exec(s);
  return plain ? plain[1] : null;
}

function todayAndTomorrowInIST() {
  const today = todayYmdInTimeZone(DEFAULT_TZ);
  const tomorrow = addCalendarDays(today, 1);
  return { today, tomorrow, todayMMDD: today.slice(5), tomorrowMMDD: tomorrow?.slice(5) };
}

module.exports = {
  DEFAULT_TZ,
  todayYmdInTimeZone,
  addCalendarDays,
  normalizeCalendarYmd,
  todayAndTomorrowInIST,
};
