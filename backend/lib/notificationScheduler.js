const db = require('../database/db');
const { sendToUsers } = require('./fcmSender');

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
let intervalHandle = null;

/**
 * Build a date reference key like "birthday-42-2026-06-07" for deduplication.
 */
function refKey(type, entityId, dateStr) {
  return `${type}-${entityId}-${dateStr}`;
}

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Send birthday notifications for today and tomorrow.
 */
async function checkBirthdays() {
  const today = todayISO();
  const tomorrow = tomorrowISO();

  const todayMMDD = today.slice(5);
  const tomorrowMMDD = tomorrow.slice(5);

  const members = await db.query(
    `SELECT fm.id, fm.name, fm.family_id,
            TO_CHAR(fm.date_of_birth, 'MM-DD') AS mmdd,
            fm.date_of_birth
     FROM family_members fm
     WHERE fm.date_of_birth IS NOT NULL
       AND fm.is_alive = 'Yes'
       AND TO_CHAR(fm.date_of_birth, 'MM-DD') IN ($1, $2)`,
    [todayMMDD, tomorrowMMDD]
  );

  for (const m of members.rows) {
    const isToday = m.mmdd === todayMMDD;
    const label = isToday ? 'today' : 'tomorrow';
    const title = isToday
      ? `Happy Birthday ${m.name}! 🎂`
      : `${m.name}'s birthday is tomorrow! 🎂`;
    const body = isToday
      ? `Wish ${m.name} a happy birthday!`
      : `Don't forget to wish ${m.name} a happy birthday tomorrow!`;

    const dateForRef = isToday ? today : tomorrow;
    const key = refKey('birthday', m.id, dateForRef);

    const familyUsers = await db.query(
      `SELECT user_id FROM family_memberships WHERE family_id = $1`,
      [m.family_id]
    );
    const userIds = familyUsers.rows.map((r) => r.user_id);
    if (userIds.length === 0) continue;

    try {
      await sendToUsers(userIds, 'birthday', key, title, body, {
        type: 'birthday',
        memberId: String(m.id),
      });
    } catch (err) {
      console.error('[scheduler] birthday push error:', err.message);
    }
  }
}

/**
 * Send anniversary notifications for today and tomorrow.
 */
async function checkAnniversaries() {
  const today = todayISO();
  const tomorrow = tomorrowISO();

  const todayMMDD = today.slice(5);
  const tomorrowMMDD = tomorrow.slice(5);

  const members = await db.query(
    `SELECT fm.id, fm.name, fm.family_id,
            TO_CHAR(fm.anniversary_date, 'MM-DD') AS mmdd,
            fm.anniversary_date
     FROM family_members fm
     WHERE fm.anniversary_date IS NOT NULL
       AND fm.is_alive = 'Yes'
       AND TO_CHAR(fm.anniversary_date, 'MM-DD') IN ($1, $2)`,
    [todayMMDD, tomorrowMMDD]
  );

  for (const m of members.rows) {
    const isToday = m.mmdd === todayMMDD;
    const label = isToday ? 'today' : 'tomorrow';
    const title = isToday
      ? `Happy Anniversary ${m.name}! 💍`
      : `${m.name}'s anniversary is tomorrow! 💍`;
    const body = isToday
      ? `Wish ${m.name} a happy anniversary!`
      : `Don't forget to wish ${m.name} a happy anniversary tomorrow!`;

    const dateForRef = isToday ? today : tomorrow;
    const key = refKey('anniversary', m.id, dateForRef);

    const familyUsers = await db.query(
      `SELECT user_id FROM family_memberships WHERE family_id = $1`,
      [m.family_id]
    );
    const userIds = familyUsers.rows.map((r) => r.user_id);
    if (userIds.length === 0) continue;

    try {
      await sendToUsers(userIds, 'anniversary', key, title, body, {
        type: 'anniversary',
        memberId: String(m.id),
      });
    } catch (err) {
      console.error('[scheduler] anniversary push error:', err.message);
    }
  }
}

/**
 * Send upcoming event notifications (today and tomorrow).
 */
async function checkEvents() {
  const today = todayISO();
  const tomorrow = tomorrowISO();

  const events = await db.query(
    `SELECT e.id, e.title, e.event_date, e.family_id
     FROM events e
     WHERE e.event_date IN ($1, $2)`,
    [today, tomorrow]
  );

  for (const evt of events.rows) {
    const eventDate = typeof evt.event_date === 'string'
      ? evt.event_date.slice(0, 10)
      : new Date(evt.event_date).toISOString().slice(0, 10);
    const isToday = eventDate === today;
    const title = isToday
      ? `Event Today: ${evt.title}`
      : `Event Tomorrow: ${evt.title}`;
    const body = isToday
      ? `${evt.title} is happening today!`
      : `${evt.title} is happening tomorrow — don't miss it!`;

    const key = refKey('event', evt.id, eventDate);

    const familyUsers = await db.query(
      `SELECT user_id FROM family_memberships WHERE family_id = $1`,
      [evt.family_id]
    );
    const userIds = familyUsers.rows.map((r) => r.user_id);
    if (userIds.length === 0) continue;

    try {
      await sendToUsers(userIds, 'event', key, title, body, {
        type: 'event',
        eventId: String(evt.id),
      });
    } catch (err) {
      console.error('[scheduler] event push error:', err.message);
    }
  }
}

/**
 * Run all notification checks. Safe to call repeatedly — deduplication
 * ensures each notification is delivered at most once per user.
 */
async function runAllChecks() {
  try {
    await checkBirthdays();
  } catch (err) {
    console.error('[scheduler] birthday check failed:', err.message);
  }
  try {
    await checkAnniversaries();
  } catch (err) {
    console.error('[scheduler] anniversary check failed:', err.message);
  }
  try {
    await checkEvents();
  } catch (err) {
    console.error('[scheduler] event check failed:', err.message);
  }
}

/**
 * Start the periodic notification scheduler.
 * First run is delayed 30 seconds to let the server fully start.
 */
function startScheduler() {
  if (intervalHandle) return;

  console.log('[scheduler] Notification scheduler starting (interval: 1 hour).');
  setTimeout(() => {
    runAllChecks();
    intervalHandle = setInterval(runAllChecks, CHECK_INTERVAL_MS);
  }, 30_000);
}

function stopScheduler() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

module.exports = { startScheduler, stopScheduler, runAllChecks };
