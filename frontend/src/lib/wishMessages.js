import { addCalendarDays, formatCalendarLong, parseCalendarYmd, todayYmdInTimeZone } from './calendarDate';

const SIGNATURE_ORG = "Jagiri's Kutumbam";

export function senderDisplayName(user) {
  const first = String(user?.first_name ?? '').trim();
  const last = String(user?.last_name ?? '').trim();
  const full = [first, last].filter(Boolean).join(' ');
  if (full) return full;
  const username = String(user?.username ?? '').trim();
  return username || 'Family member';
}

export function memberDisplayName(member) {
  if (!member) return 'Family member';
  return [member.name, member.surname].filter(Boolean).join(' ') || member.name || 'Family member';
}

export function isMemberDeceased(member) {
  if (!member) return false;
  if (member.is_alive === false) return true;
  if (typeof member.is_alive === 'string' && member.is_alive.trim().toLowerCase() === 'no') return true;
  return !!member.date_of_death;
}

function nextOccurrenceYmd(dateValue, todayYmd) {
  const p = parseCalendarYmd(dateValue);
  if (!p || !todayYmd) return null;
  const ty = parseInt(todayYmd.slice(0, 4), 10);
  const md = p.ymd.slice(5);
  let nextYmd = `${ty}-${md}`;
  if (nextYmd < todayYmd) nextYmd = `${ty + 1}-${md}`;
  return nextYmd;
}

/**
 * Recurring month-day (birthday / anniversary) vs IST today.
 * @returns {'today' | 'tomorrow' | null}
 */
export function recurringOccasionTiming(dateValue) {
  const todayYmd = todayYmdInTimeZone('Asia/Kolkata');
  const tomorrowYmd = addCalendarDays(todayYmd, 1);
  const nextYmd = nextOccurrenceYmd(dateValue, todayYmd);
  if (!todayYmd || !nextYmd) return null;
  if (nextYmd === todayYmd) return 'today';
  if (tomorrowYmd && nextYmd === tomorrowYmd) return 'tomorrow';
  return null;
}

/**
 * One-shot calendar date (events) vs IST today.
 * @returns {'today' | 'tomorrow' | null}
 */
export function absoluteOccasionTiming(dateValue) {
  const todayYmd = todayYmdInTimeZone('Asia/Kolkata');
  const tomorrowYmd = addCalendarDays(todayYmd, 1);
  const p = parseCalendarYmd(dateValue);
  if (!p || !todayYmd) return null;
  if (p.ymd === todayYmd) return 'today';
  if (tomorrowYmd && p.ymd === tomorrowYmd) return 'tomorrow';
  return null;
}

function withSignature(body, senderName) {
  const trimmed = String(body || '').trim();
  return `${trimmed}\n\nWarm wishes,\n${senderName}\n${SIGNATURE_ORG}`;
}

export function birthdayWishText(name, senderName) {
  return withSignature(
    `Happy Birthday, ${name}! 🎉\nWishing you a beautiful day filled with happiness, good health, and wonderful memories. May the year ahead bring you lots of joy! ❤️`,
    senderName
  );
}

export function advanceBirthdayWishText(name, senderName) {
  return withSignature(
    `Advance Happy Birthday, ${name}! 🎉\nWishing you a beautiful day tomorrow filled with happiness, good health, and wonderful memories. May the year ahead bring you lots of joy! ❤️`,
    senderName
  );
}

export function anniversaryWishText(name, senderName) {
  return withSignature(
    `Happy Anniversary, ${name}! ❤️🎉\nWishing you both a lifetime of love, happiness, togetherness, and beautiful memories.`,
    senderName
  );
}

export function advanceAnniversaryWishText(name, senderName) {
  return withSignature(
    `Advance Happy Anniversary, ${name}! ❤️🎉\nWishing you both a lifetime of love, happiness, and togetherness as you celebrate tomorrow.`,
    senderName
  );
}

export function eventShareText({ title, date, description, senderName }) {
  const desc = String(description || '').trim();
  const lines = [`📅 ${title || 'Family event'}`, `Date: ${date || ''}`];
  if (desc) {
    lines.push('', desc);
  }
  lines.push('', 'We look forward to celebrating this special occasion together! ❤️');
  return withSignature(lines.join('\n'), senderName);
}

export function advanceEventShareText({ title, date, description, senderName }) {
  const desc = String(description || '').trim();
  const lines = [`📅 ${title || 'Family event'} is tomorrow`, `Date: ${date || ''}`];
  if (desc) {
    lines.push('', desc);
  }
  lines.push('', 'Looking forward to celebrating this special occasion together! ❤️');
  return withSignature(lines.join('\n'), senderName);
}

export function eventShareTextForTiming(event, senderName, timing) {
  const payload = {
    title: event?.title,
    date: formatEventDateLabel(event?.event_date || event?.dateYmd),
    description: event?.description,
    senderName,
  };
  return timing === 'tomorrow' ? advanceEventShareText(payload) : eventShareText(payload);
}

export function birthdayWishTextForTiming(name, senderName, timing) {
  return timing === 'tomorrow' ? advanceBirthdayWishText(name, senderName) : birthdayWishText(name, senderName);
}

export function anniversaryWishTextForTiming(name, senderName, timing) {
  return timing === 'tomorrow'
    ? advanceAnniversaryWishText(name, senderName)
    : anniversaryWishText(name, senderName);
}

/** @typedef {'birthday' | 'birthday_advance' | 'anniversary' | 'anniversary_advance' | null} MemberWishKind */

/**
 * Today’s occasion wins over tomorrow’s if both apply.
 * @param {Record<string, unknown> | null | undefined} member
 * @returns {MemberWishKind}
 */
export function pickMemberWishKind(member) {
  if (!member || isMemberDeceased(member)) return null;
  const b = recurringOccasionTiming(member.date_of_birth);
  const a = recurringOccasionTiming(member.anniversary_date);
  if (b === 'today') return 'birthday';
  if (a === 'today') return 'anniversary';
  if (b === 'tomorrow') return 'birthday_advance';
  if (a === 'tomorrow') return 'anniversary_advance';
  return null;
}

export function shouldShowMemberWish(member) {
  return pickMemberWishKind(member) != null;
}

export function shouldShowEventShare(eventDate) {
  return absoluteOccasionTiming(eventDate) != null;
}

export function memberWishText(member, senderName) {
  const name = memberDisplayName(member);
  switch (pickMemberWishKind(member)) {
    case 'birthday':
      return birthdayWishText(name, senderName);
    case 'birthday_advance':
      return advanceBirthdayWishText(name, senderName);
    case 'anniversary':
      return anniversaryWishText(name, senderName);
    case 'anniversary_advance':
      return advanceAnniversaryWishText(name, senderName);
    default:
      return '';
  }
}

export function formatEventDateLabel(eventDate) {
  return formatCalendarLong(eventDate) || String(eventDate || '').slice(0, 10);
}
