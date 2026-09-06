/**
 * Occasion in-app notifications (birthday / anniversary / event) store relative
 * copy at send time. When serving the bell feed, rewrite title/body from the
 * occasion date in reference_key vs IST today, and treat past occasions as
 * non-urgent (no unread badge).
 */
const {
  todayYmdInTimeZone,
  normalizeCalendarYmd,
  DEFAULT_TZ,
} = require('./calendarDate');

const OCCASION_TYPES = new Set(['birthday', 'anniversary', 'event']);

const REF_RE = /^(birthday|anniversary|event)-(\d+)-(\d{4}-\d{2}-\d{2})$/;

function formatShortDate(ymd) {
  const n = normalizeCalendarYmd(ymd);
  if (!n) return '';
  const [y, m, d] = n.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return dt.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function daysBetween(fromYmd, toYmd) {
  const a = normalizeCalendarYmd(fromYmd);
  const b = normalizeCalendarYmd(toYmd);
  if (!a || !b) return null;
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

function parseOccasionRef(referenceKey) {
  const m = REF_RE.exec(String(referenceKey || '').trim());
  if (!m) return null;
  return {
    kind: m[1],
    entityId: Number(m[2]),
    occasionYmd: m[3],
  };
}

function extractDisplayName(title, kind) {
  const t = String(title || '').trim();
  if (!t) return 'Family member';

  // Normalize curly apostrophes from stored copy.
  const n = t.replace(/\u2019/g, "'");

  let m;
  if (kind === 'birthday') {
    m = /^Happy Birthday\s+(.+?)\s*!/i.exec(n);
    if (m) return m[1].trim();
    m = /^(.+?)'s birthday\b/i.exec(n);
    if (m) return m[1].trim();
  }
  if (kind === 'anniversary') {
    m = /^Happy Anniversary\s+(.+?)\s*!/i.exec(n);
    if (m) return m[1].trim();
    m = /^(.+?)'s anniversary\b/i.exec(n);
    if (m) return m[1].trim();
  }
  if (kind === 'event') {
    m = /^Event (?:Today|Tomorrow):\s*(.+)$/i.exec(n);
    if (m) return m[1].trim();
    m = /^(.+?)\s+is happening\b/i.exec(n);
    if (m) return m[1].trim();
  }
  return n.replace(/\s*[\u{1F382}\u{1F48D}].*$/u, '').trim() || 'Family member';
}

/**
 * @param {{ type: string, title: string, body?: string|null, reference_key?: string|null }} row
 * @param {string} [todayYmd]
 * @returns {{ title: string, body: string|null, isPast: boolean, occasionYmd: string|null }}
 */
function resolveOccasionDisplay(row, todayYmd = todayYmdInTimeZone(DEFAULT_TZ)) {
  const type = String(row?.type || '');
  const title = row?.title || '';
  const body = row?.body ?? null;

  if (!OCCASION_TYPES.has(type)) {
    return { title, body, isPast: false, occasionYmd: null };
  }

  const parsed = parseOccasionRef(row.reference_key);
  if (!parsed || parsed.kind !== type) {
    return { title, body, isPast: false, occasionYmd: null };
  }

  const days = daysBetween(todayYmd, parsed.occasionYmd);
  if (days == null) {
    return { title, body, isPast: false, occasionYmd: parsed.occasionYmd };
  }

  const name = extractDisplayName(title, type);
  const dateLabel = formatShortDate(parsed.occasionYmd);
  const isPast = days < 0;

  if (type === 'birthday') {
    if (days < 0) {
      return {
        title: `${name}'s birthday was on ${dateLabel}`,
        body: `This birthday reminder has passed.`,
        isPast: true,
        occasionYmd: parsed.occasionYmd,
      };
    }
    if (days === 0) {
      return {
        title: `Happy Birthday ${name}! 🎂`,
        body: `Wish ${name} a happy birthday!`,
        isPast: false,
        occasionYmd: parsed.occasionYmd,
      };
    }
    if (days === 1) {
      return {
        title: `${name}'s birthday is tomorrow! 🎂`,
        body: `Don't forget to wish ${name} a happy birthday tomorrow!`,
        isPast: false,
        occasionYmd: parsed.occasionYmd,
      };
    }
    return {
      title: `${name}'s birthday is on ${dateLabel}`,
      body: `Don't forget to wish ${name} a happy birthday.`,
      isPast: false,
      occasionYmd: parsed.occasionYmd,
    };
  }

  if (type === 'anniversary') {
    if (days < 0) {
      return {
        title: `${name}'s anniversary was on ${dateLabel}`,
        body: `This anniversary reminder has passed.`,
        isPast: true,
        occasionYmd: parsed.occasionYmd,
      };
    }
    if (days === 0) {
      return {
        title: `Happy Anniversary ${name}! 💍`,
        body: `Wish ${name} a happy anniversary!`,
        isPast: false,
        occasionYmd: parsed.occasionYmd,
      };
    }
    if (days === 1) {
      return {
        title: `${name}'s anniversary is tomorrow! 💍`,
        body: `Don't forget to wish ${name} a happy anniversary tomorrow!`,
        isPast: false,
        occasionYmd: parsed.occasionYmd,
      };
    }
    return {
      title: `${name}'s anniversary is on ${dateLabel}`,
      body: `Don't forget to wish ${name} a happy anniversary.`,
      isPast: false,
      occasionYmd: parsed.occasionYmd,
    };
  }

  // event
  if (days < 0) {
    return {
      title: `Event ended: ${name}`,
      body: `${name} was on ${dateLabel}.`,
      isPast: true,
      occasionYmd: parsed.occasionYmd,
    };
  }
  if (days === 0) {
    return {
      title: `Event Today: ${name}`,
      body: `${name} is happening today!`,
      isPast: false,
      occasionYmd: parsed.occasionYmd,
    };
  }
  if (days === 1) {
    return {
      title: `Event Tomorrow: ${name}`,
      body: `${name} is happening tomorrow — don't miss it!`,
      isPast: false,
      occasionYmd: parsed.occasionYmd,
    };
  }
  return {
    title: `Upcoming: ${name}`,
    body: `${name} is on ${dateLabel}.`,
    isPast: false,
    occasionYmd: parsed.occasionYmd,
  };
}

function isOccasionType(type) {
  return OCCASION_TYPES.has(String(type || ''));
}

module.exports = {
  OCCASION_TYPES,
  parseOccasionRef,
  resolveOccasionDisplay,
  isOccasionType,
  formatShortDate,
};
