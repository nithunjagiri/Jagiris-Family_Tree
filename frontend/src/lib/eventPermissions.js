import { parseCalendarYmd, todayYmdInTimeZone } from './calendarDate';

/** @param {unknown} eventDate */
export function isEventUpcoming(eventDate) {
  const parsed = parseCalendarYmd(eventDate);
  if (!parsed) return false;
  return parsed.ymd >= todayYmdInTimeZone('Asia/Kolkata');
}

/** @param {{ created_by?: number | null } | null | undefined} event @param {{ id?: number; isAdmin?: boolean } | null | undefined} user */
export function canDeleteEvent(event, user) {
  if (!event || !user) return false;
  if (user.isAdmin) return true;
  if (event.created_by == null) return false;
  return Number(event.created_by) === Number(user.id);
}

/** @param {{ created_by?: number | null; event_date?: unknown } | null | undefined} event @param {{ id?: number; isAdmin?: boolean } | null | undefined} user */
export function canEditEvent(event, user) {
  if (!canDeleteEvent(event, user)) return false;
  return isEventUpcoming(event.event_date);
}
