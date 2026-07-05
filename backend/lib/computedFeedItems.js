const db = require('../database/db');
const { todayYmdInTimeZone, addCalendarDays, normalizeCalendarYmd } = require('./calendarDate');

const DEFAULT_TZ = 'Asia/Kolkata';
const UPCOMING_DAYS = 60;

function memberDisplayName(row) {
  return [row.name, row.surname].filter(Boolean).join(' ').trim() || row.name || 'Member';
}

function formatShortDate(ymd) {
  const n = normalizeCalendarYmd(ymd);
  if (!n) return '';
  const [y, m, d] = n.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function daysUntil(fromYmd, toYmd) {
  const a = normalizeCalendarYmd(fromYmd);
  const b = normalizeCalendarYmd(toYmd);
  if (!a || !b) return null;
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  const ms1 = Date.UTC(y1, m1 - 1, d1);
  const ms2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((ms2 - ms1) / 86400000);
}

function whenLabel(days) {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days != null && days > 1) return `in ${days} days`;
  return 'soon';
}

/**
 * @param {number} familyId
 * @param {Set<string>} dismissedKeys
 * @returns {Promise<object[]>}
 */
async function buildComputedFeedItems(familyId, dismissedKeys = new Set()) {
  const today = todayYmdInTimeZone(DEFAULT_TZ);
  const endYmd = addCalendarDays(today, UPCOMING_DAYS);
  if (!today || !endYmd) return [];

  const ty = parseInt(today.slice(0, 4), 10);
  const items = [];

  const members = await db.query(
    `SELECT id, name, surname, date_of_birth, anniversary_date, is_alive, date_of_death
     FROM family_members
     WHERE family_id = $1::integer`,
    [Number(familyId)]
  );

  for (const m of members.rows) {
    const living =
      (m.is_alive == null || String(m.is_alive).trim() === 'Yes') &&
      (m.date_of_death == null || String(m.date_of_death).trim() === '');

    if (living && m.date_of_birth) {
      const dob = normalizeCalendarYmd(m.date_of_birth);
      if (dob) {
        const md = dob.slice(5);
        let nextYmd = `${ty}-${md}`;
        if (nextYmd < today) nextYmd = `${ty + 1}-${md}`;
        if (nextYmd >= today && nextYmd <= endYmd) {
          const ref = `upcoming:birthday:${m.id}:${nextYmd}`;
          if (!dismissedKeys.has(ref)) {
            const days = daysUntil(today, nextYmd);
            const name = memberDisplayName(m);
            items.push({
              id: `computed:${ref}`,
              type: 'birthday_upcoming',
              title: `Birthday ${whenLabel(days)}: ${name}`,
              body: `${name}'s birthday is on ${formatShortDate(nextYmd)}.`,
              entity_type: 'family_member',
              entity_id: m.id,
              link_path: `/family-members/${m.id}`,
              actor_user_id: null,
              read_at: null,
              created_at: `${nextYmd}T08:00:00.000Z`,
              is_computed: true,
              reference_key: ref,
            });
          }
        }
      }
    }

    if (living && m.anniversary_date) {
      const ann = normalizeCalendarYmd(m.anniversary_date);
      if (ann) {
        const md = ann.slice(5);
        let nextYmd = `${ty}-${md}`;
        if (nextYmd < today) nextYmd = `${ty + 1}-${md}`;
        if (nextYmd >= today && nextYmd <= endYmd) {
          const ref = `upcoming:anniversary:${m.id}:${nextYmd}`;
          if (!dismissedKeys.has(ref)) {
            const days = daysUntil(today, nextYmd);
            const name = memberDisplayName(m);
            items.push({
              id: `computed:${ref}`,
              type: 'anniversary_upcoming',
              title: `Anniversary ${whenLabel(days)}: ${name}`,
              body: `${name}'s anniversary is on ${formatShortDate(nextYmd)}.`,
              entity_type: 'family_member',
              entity_id: m.id,
              link_path: `/family-members/${m.id}`,
              actor_user_id: null,
              read_at: null,
              created_at: `${nextYmd}T08:00:00.000Z`,
              is_computed: true,
              reference_key: ref,
            });
          }
        }
      }
    }
  }

  const events = await db.query(
    `SELECT id, title, event_date, description
     FROM events
     WHERE family_id = $1::integer
       AND event_date::date >= $2::date
       AND event_date::date <= $3::date
     ORDER BY event_date::date ASC
     LIMIT 30`,
    [Number(familyId), today, endYmd]
  );

  for (const ev of events.rows) {
    const eventDate = normalizeCalendarYmd(ev.event_date);
    if (!eventDate) continue;
    const ref = `upcoming:event:${ev.id}:${eventDate}`;
    if (dismissedKeys.has(ref)) continue;
    const days = daysUntil(today, eventDate);
    items.push({
      id: `computed:${ref}`,
      type: 'event_upcoming',
      title: `Event ${whenLabel(days)}: ${ev.title}`,
      body: ev.description || `${ev.title} on ${formatShortDate(eventDate)}.`,
      entity_type: 'event',
      entity_id: ev.id,
      link_path: '/events',
      actor_user_id: null,
      read_at: null,
      created_at: `${eventDate}T09:00:00.000Z`,
      is_computed: true,
      reference_key: ref,
    });
  }

  items.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  return items.slice(0, 40);
}

module.exports = { buildComputedFeedItems, UPCOMING_DAYS };
