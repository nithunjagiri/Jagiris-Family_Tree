/**
 * Auto-send birthday / anniversary wishes to family_members.email (IST today/tomorrow).
 * Copy matches frontend wishMessages.js; signature uses app name only (no logged-in user).
 */
const db = require('../database/db');
const { sendWishEmail, isWishMailConfigured, LOGO_CID } = require('./smtpWishSend');

const SIGNATURE_ORG = "Jagiri's Kutumbam";
const SYSTEM_SENDER = SIGNATURE_ORG;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function memberDisplayName(member) {
  if (!member) return 'Family member';
  const parts = [member.name, member.surname].filter(Boolean);
  return parts.join(' ') || member.name || 'Family member';
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function withSignature(body) {
  const trimmed = String(body || '').trim();
  return `${trimmed}\n\nWarm wishes,\n${SYSTEM_SENDER}`;
}

function birthdayWishBody(name, isToday) {
  if (isToday) {
    return `Happy Birthday, ${name}! 🎉\nWishing you a beautiful day filled with happiness, good health, and wonderful memories. May the year ahead bring you lots of joy! ❤️`;
  }
  return `Advance Happy Birthday, ${name}! 🎉\nWishing you a beautiful day tomorrow filled with happiness, good health, and wonderful memories. May the year ahead bring you lots of joy! ❤️`;
}

function anniversaryWishBody(name, isToday) {
  if (isToday) {
    return `Happy Anniversary, ${name}! ❤️🎉\nWishing you both a lifetime of love, happiness, togetherness, and beautiful memories.`;
  }
  return `Advance Happy Anniversary, ${name}! ❤️🎉\nWishing you both a lifetime of love, happiness, and togetherness as you celebrate tomorrow.`;
}

function buildWishContent({ name, kind, isToday }) {
  let body;
  let subject;
  if (kind === 'birthday') {
    body = birthdayWishBody(name, isToday);
    subject = isToday ? `Happy Birthday, ${name}!` : `Advance Happy Birthday, ${name}!`;
  } else {
    body = anniversaryWishBody(name, isToday);
    subject = isToday ? `Happy Anniversary, ${name}!` : `Advance Happy Anniversary, ${name}!`;
  }

  const text = withSignature(body);
  const bodyHtml = escapeHtml(body).replace(/\n/g, '<br>');
  const html = `<div style="font-family:Georgia,serif;font-size:16px;line-height:1.5;color:#1a1a1a;">
<p>${bodyHtml}</p>
<p style="margin-top:1.5em;">Warm wishes,<br><strong>${escapeHtml(SIGNATURE_ORG)}</strong></p>
<p style="margin-top:0.75em;"><img src="cid:${LOGO_CID}" alt="${escapeHtml(SIGNATURE_ORG)}" width="96" height="96" style="display:block;border-radius:50%;" /></p>
</div>`;

  return { subject, text, html };
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  const trimmed = String(email || '').trim();
  return trimmed.length > 0 && EMAIL_RE.test(trimmed);
}

async function wasOccasionEmailDelivered(notificationType, referenceKey) {
  const result = await db.query(
    `SELECT 1 FROM notification_deliveries
     WHERE notification_type = $1 AND reference_key = $2
     LIMIT 1`,
    [notificationType, referenceKey]
  );
  return result.rowCount > 0;
}

/** user_id satisfies FK; dedup is by notification_type + reference_key. */
async function markOccasionEmailDelivered(notificationType, referenceKey, userIdForFk) {
  await db.query(
    `INSERT INTO notification_deliveries (user_id, notification_type, reference_key)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, notification_type, reference_key) DO NOTHING`,
    [userIdForFk, notificationType, referenceKey]
  );
}

async function fkUserIdForMember(member) {
  if (member.linked_user_id) return member.linked_user_id;
  const result = await db.query(
    `SELECT user_id FROM family_memberships WHERE family_id = $1 ORDER BY user_id LIMIT 1`,
    [member.family_id]
  );
  return result.rows[0]?.user_id ?? null;
}

/**
 * @param {{ member: object, kind: 'birthday'|'anniversary', referenceKey: string, isToday: boolean, sentEmails?: Set<string> }} opts
 */
async function sendOccasionWishIfDue({ member, kind, referenceKey, isToday, sentEmails }) {
  if (!isWishMailConfigured()) return { skipped: true };

  const to = String(member.email || '').trim();
  if (!isValidEmail(to)) return { skipped: true };

  const normalized = normalizeEmail(to);
  if (sentEmails && sentEmails.has(normalized)) return { skipped: true };

  const notificationType = kind === 'birthday' ? 'email_birthday' : 'email_anniversary';
  if (await wasOccasionEmailDelivered(notificationType, referenceKey)) {
    return { skipped: true };
  }

  const fkUserId = await fkUserIdForMember(member);
  if (!fkUserId) {
    console.warn(`[occasion-email] No family user for FK; skip ${notificationType} ${referenceKey}`);
    return { skipped: true };
  }

  const name = memberDisplayName(member);
  const { subject, text, html } = buildWishContent({ name, kind, isToday });

  try {
    const result = await sendWishEmail({ to, subject, text, html });
    if (result.skipped) return result;
    await markOccasionEmailDelivered(notificationType, referenceKey, fkUserId);
    if (sentEmails) sentEmails.add(normalized);
    return { sent: true };
  } catch (err) {
    console.error(`[occasion-email] ${notificationType} to ${normalized}:`, err.message);
    return { error: true };
  }
}

module.exports = {
  sendOccasionWishIfDue,
  isWishMailConfigured,
  buildWishContent,
  memberDisplayName,
};
