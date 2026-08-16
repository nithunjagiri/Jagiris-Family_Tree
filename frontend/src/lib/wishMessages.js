import { addCalendarDays, formatCalendarLong, parseCalendarYmd, todayYmdInTimeZone } from './calendarDate';

const SIGNATURE_ORG = "Jagiri's Kutumbam";
const SOON_DAYS = 60;

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

function isSoon(dateValue, withinDays = SOON_DAYS) {
  const todayYmd = todayYmdInTimeZone('Asia/Kolkata');
  const endYmd = addCalendarDays(todayYmd, withinDays);
  const nextYmd = nextOccurrenceYmd(dateValue, todayYmd);
  if (!todayYmd || !endYmd || !nextYmd) return false;
  return nextYmd >= todayYmd && nextYmd <= endYmd;
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

export function anniversaryWishText(name, senderName) {
  return withSignature(
    `Happy Anniversary, ${name}! ❤️🎉\nWishing you both a lifetime of love, happiness, togetherness, and beautiful memories.`,
    senderName
  );
}

export function generalWishText(name, senderName, extraMessage = '') {
  const extra = String(extraMessage || '').trim();
  const body = extra
    ? `Hi ${name}! 👋\nWe're happy to have you as a part of Jagiri's Kutumbam ❤️\n${extra}`
    : `Hi ${name}! 👋\nWe're happy to have you as a part of Jagiri's Kutumbam ❤️`;
  return withSignature(body, senderName);
}

export function condolenceWishText(name, senderName) {
  return withSignature(
    `With heartfelt remembrance 🕊️\n\nWe remember ${name} with love and respect. Their memories will always remain a cherished part of our family.`,
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

export function familyCelebrationText(message, senderName) {
  const extra = String(message || '').trim();
  const body = extra
    ? `🎉 A special moment for Jagiri's Kutumbam!\n\n${extra}\n\nLet's come together and make this occasion memorable. ❤️`
    : `🎉 A special moment for Jagiri's Kutumbam!\n\nLet's come together and make this occasion memorable. ❤️`;
  return withSignature(body, senderName);
}

/** @typedef {'condolence' | 'birthday' | 'anniversary' | 'general'} MemberWishKind */

/**
 * @param {Record<string, unknown> | null | undefined} member
 * @returns {MemberWishKind}
 */
export function pickMemberWishKind(member) {
  if (isMemberDeceased(member)) return 'condolence';
  if (isSoon(member?.date_of_birth)) return 'birthday';
  if (isSoon(member?.anniversary_date)) return 'anniversary';
  return 'general';
}

export function memberWishText(member, senderName) {
  const name = memberDisplayName(member);
  switch (pickMemberWishKind(member)) {
    case 'condolence':
      return condolenceWishText(name, senderName);
    case 'birthday':
      return birthdayWishText(name, senderName);
    case 'anniversary':
      return anniversaryWishText(name, senderName);
    default:
      return generalWishText(name, senderName);
  }
}

export function formatEventDateLabel(eventDate) {
  return formatCalendarLong(eventDate) || String(eventDate || '').slice(0, 10);
}
