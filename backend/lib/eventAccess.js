/** Calendar today in Asia/Kolkata as YYYY-MM-DD */
function todayYmdInTimeZone(timeZone = 'Asia/Kolkata') {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** @param {unknown} value */
function parseEventDateYmd(value) {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/** @param {unknown} eventDate */
function isEventUpcoming(eventDate) {
  const ymd = parseEventDateYmd(eventDate);
  if (!ymd) return false;
  return ymd >= todayYmdInTimeZone('Asia/Kolkata');
}

/** @param {{ id?: number; isAdmin?: boolean } | null | undefined} user @param {{ created_by?: number | null } | null | undefined} event */
function canDeleteEvent(user, event) {
  if (!user || !event) return false;
  if (user.isAdmin) return true;
  if (event.created_by == null) return false;
  return Number(event.created_by) === Number(user.id);
}

/** @param {{ id?: number; isAdmin?: boolean } | null | undefined} user @param {{ created_by?: number | null; event_date?: unknown } | null | undefined} event */
function canEditEvent(user, event) {
  if (!canDeleteEvent(user, event)) return false;
  return isEventUpcoming(event?.event_date);
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/** @param {{ id?: number; isAdmin?: boolean } | null | undefined} user @param {{ created_by?: number | null } | null | undefined} event */
function assertCanDeleteEvent(user, event) {
  if (!canDeleteEvent(user, event)) {
    throw httpError(403, 'You are not allowed to delete this event');
  }
}

/** @param {{ id?: number; isAdmin?: boolean } | null | undefined} user @param {{ created_by?: number | null; event_date?: unknown } | null | undefined} event */
function assertCanEditEvent(user, event) {
  if (!canDeleteEvent(user, event)) {
    throw httpError(403, 'You are not allowed to edit this event');
  }
  if (!isEventUpcoming(event?.event_date)) {
    throw httpError(403, 'Past events cannot be edited');
  }
}

module.exports = {
  todayYmdInTimeZone,
  parseEventDateYmd,
  isEventUpcoming,
  canDeleteEvent,
  canEditEvent,
  assertCanDeleteEvent,
  assertCanEditEvent,
};
