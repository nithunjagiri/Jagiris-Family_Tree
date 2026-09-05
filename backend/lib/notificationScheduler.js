const db = require('../database/db');
const { sendToUsers } = require('./fcmSender');
const { scheduleInAppNotification } = require('./inAppNotifications');
const { todayAndTomorrowInIST, normalizeCalendarYmd } = require('./calendarDate');
const { sendOccasionWishIfDue } = require('./occasionEmail');

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
let intervalHandle = null;

/**
 * Build a date reference key like "birthday-42-2026-06-07" for deduplication.
 */
function refKey(type, entityId, dateStr) {
  return `${type}-${entityId}-${dateStr}`;
}

/**
 * Send birthday notifications for today and tomorrow (IST calendar dates).
 */
async function checkBirthdays() {
  const { today, tomorrow, todayMMDD, tomorrowMMDD } = todayAndTomorrowInIST();
  if (!tomorrowMMDD) return;

  const members = await db.query(
    `SELECT fm.id, fm.name, fm.surname, fm.family_id, fm.email, fm.linked_user_id,
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
    const title = isToday
      ? `Happy Birthday ${m.name}! 🎂`
      : `${m.name}'s birthday is tomorrow! 🎂`;
    const body = isToday
      ? `Wish ${m.name} a happy birthday!`
      : `Don't forget to wish ${m.name} a happy birthday tomorrow!`;

    const dateForRef = isToday ? today : tomorrow;
    const key = refKey('birthday', m.id, dateForRef);
    const linkPath = `/family-members/${m.id}`;

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
        linkPath,
      });
      scheduleInAppNotification({
        familyId: m.family_id,
        excludeUserId: null,
        type: 'birthday',
        title,
        body,
        entityType: 'family_member',
        entityId: m.id,
        linkPath,
        referenceKey: key,
      });
    } catch (err) {
      console.error('[scheduler] birthday push error:', err.message);
    }

    try {
      await sendOccasionWishIfDue({
        member: m,
        kind: 'birthday',
        referenceKey: key,
        isToday,
      });
    } catch (err) {
      console.error('[scheduler] birthday wish email error:', err.message);
    }
  }
}

/**
 * Send anniversary notifications for today and tomorrow (IST calendar dates).
 */
async function checkAnniversaries() {
  const { today, tomorrow, todayMMDD, tomorrowMMDD } = todayAndTomorrowInIST();
  if (!tomorrowMMDD) return;

  const members = await db.query(
    `SELECT fm.id, fm.name, fm.surname, fm.family_id, fm.email, fm.linked_user_id, fm.spouse_id,
            TO_CHAR(fm.anniversary_date, 'MM-DD') AS mmdd,
            fm.anniversary_date
     FROM family_members fm
     WHERE fm.anniversary_date IS NOT NULL
       AND fm.is_alive = 'Yes'
       AND TO_CHAR(fm.anniversary_date, 'MM-DD') IN ($1, $2)`,
    [todayMMDD, tomorrowMMDD]
  );

  const sentEmails = new Set();

  for (const m of members.rows) {
    const isToday = m.mmdd === todayMMDD;
    const title = isToday
      ? `Happy Anniversary ${m.name}! 💍`
      : `${m.name}'s anniversary is tomorrow! 💍`;
    const body = isToday
      ? `Wish ${m.name} a happy anniversary!`
      : `Don't forget to wish ${m.name} a happy anniversary tomorrow!`;

    const dateForRef = isToday ? today : tomorrow;
    const key = refKey('anniversary', m.id, dateForRef);
    const linkPath = `/family-members/${m.id}`;

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
        linkPath,
      });
      scheduleInAppNotification({
        familyId: m.family_id,
        excludeUserId: null,
        type: 'anniversary',
        title,
        body,
        entityType: 'family_member',
        entityId: m.id,
        linkPath,
        referenceKey: key,
      });
    } catch (err) {
      console.error('[scheduler] anniversary push error:', err.message);
    }

    try {
      await sendOccasionWishIfDue({
        member: m,
        kind: 'anniversary',
        referenceKey: key,
        isToday,
        sentEmails,
      });
    } catch (err) {
      console.error('[scheduler] anniversary wish email error:', err.message);
    }
  }
}

/**
 * Send upcoming event notifications (today and tomorrow in IST).
 */
async function checkEvents() {
  const { today, tomorrow } = todayAndTomorrowInIST();

  const events = await db.query(
    `SELECT e.id, e.title, e.event_date, e.family_id
     FROM events e
     WHERE e.event_date IN ($1::date, $2::date)`,
    [today, tomorrow]
  );

  for (const evt of events.rows) {
    const eventDate = normalizeCalendarYmd(evt.event_date);
    if (!eventDate) continue;

    const isToday = eventDate === today;
    const title = isToday
      ? `Event Today: ${evt.title}`
      : `Event Tomorrow: ${evt.title}`;
    const body = isToday
      ? `${evt.title} is happening today!`
      : `${evt.title} is happening tomorrow — don't miss it!`;

    const key = refKey('event', evt.id, eventDate);
    const linkPath = `/events/${evt.id}`;

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
        linkPath,
      });
      scheduleInAppNotification({
        familyId: evt.family_id,
        excludeUserId: null,
        type: 'event',
        title,
        body,
        entityType: 'event',
        entityId: evt.id,
        linkPath,
        referenceKey: key,
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

  console.log('[scheduler] Notification scheduler starting (interval: 1 hour, dates: IST).');
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
