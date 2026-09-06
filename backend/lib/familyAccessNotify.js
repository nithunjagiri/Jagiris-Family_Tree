/**
 * Family-access lifecycle notifications (self-register pending → admin approve).
 *
 * Channels (best-effort, never blocks HTTP responses):
 *  1) In-app bell (user_notifications)
 *  2) FCM push (mobile)
 *  3) Email (Resend/SMTP transactional; optional Gmail wish SMTP fallback)
 *
 * Isolated from OTP and occasion-wish senders so failures here cannot break those flows.
 */
const db = require('../database/db');
const {
  notifyAdminsPendingFamilyAccess,
  getActiveAdminUserIds,
  ensureNotificationSchema,
} = require('./inAppNotifications');
const { findSharedFamilyId } = require('./familyAccess');
const { sendToUsers } = require('./fcmSender');
const { sendTransactionalEmail, isTransactionalMailConfigured } = require('./emailSend');
const { sendWishEmail, isWishMailConfigured } = require('./smtpWishSend');

function appBaseUrl() {
  const raw =
    (process.env.FRONTEND_ORIGIN && String(process.env.FRONTEND_ORIGIN).split(',')[0]) ||
    (process.env.CORS_ORIGINS && String(process.env.CORS_ORIGINS).split(',')[0]) ||
    'https://jagiris-family.vercel.app';
  return String(raw).trim().replace(/\/$/, '') || 'https://jagiris-family.vercel.app';
}

async function sendAccessEmail({ to, subject, text, html }) {
  try {
    if (isTransactionalMailConfigured()) {
      try {
        const r = await sendTransactionalEmail({ to, subject, text, html });
        if (r?.ok) return r;
      } catch (err) {
        console.warn('[familyAccessNotify] transactional email failed, trying wish SMTP:', err.message);
      }
    }
    if (isWishMailConfigured()) {
      const r = await sendWishEmail({ to, subject, text, html });
      if (r?.skipped) return r;
      return { ok: true };
    }
    return { skipped: true, reason: 'not_configured' };
  } catch (err) {
    console.error('[familyAccessNotify] email error:', err.message);
    return { skipped: true, reason: 'send_failed' };
  }
}

async function getActiveAdminContacts() {
  try {
    const r = await db.query(
      `SELECT id, username, email
       FROM users
       WHERE COALESCE(is_admin, false) = true
         AND COALESCE(is_active, true) = true`
    );
    return r.rows;
  } catch (err) {
    if (err.code === '42703') {
      const r = await db.query(
        `SELECT id, username, email FROM users WHERE COALESCE(is_admin, false) = true`
      );
      return r.rows;
    }
    throw err;
  }
}

async function getUserContact(userId) {
  try {
    const r = await db.query(
      `SELECT id, username, email, first_name, last_name
       FROM users WHERE id = $1::integer`,
      [Number(userId)]
    );
    return r.rows[0] || null;
  } catch (err) {
    if (err.code === '42703') {
      const r = await db.query(
        `SELECT id, username, email FROM users WHERE id = $1::integer`,
        [Number(userId)]
      );
      return r.rows[0] || null;
    }
    throw err;
  }
}

function displayNameFromRow(row, fallback) {
  if (!row) return fallback || 'Member';
  const full = [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
  return full || row.username || fallback || 'Member';
}

/**
 * After self-register: notify every admin (bell + push + email).
 */
async function notifyAdminsOfPendingRegistration({
  pendingUserId,
  pendingUsername,
  pendingDisplayName,
  pendingEmail,
}) {
  if (!pendingUserId) return;

  const who =
    (pendingDisplayName && String(pendingDisplayName).trim()) ||
    (pendingUsername && String(pendingUsername).trim()) ||
    `User #${pendingUserId}`;

  const adminIds = await notifyAdminsPendingFamilyAccess({
    pendingUserId,
    pendingUsername,
    pendingDisplayName: who,
  });

  const recipients = (adminIds || []).filter((id) => id !== Number(pendingUserId));
  const refKey = `access_pending-${pendingUserId}`;
  const title = 'New user awaiting approval';
  const body = `${who} registered and is waiting for family access approval.`;
  const linkPath = '/admin/users?family_access=pending';
  const approveUrl = `${appBaseUrl()}${linkPath}`;

  if (recipients.length > 0) {
    try {
      await sendToUsers(recipients, 'access_pending', refKey, title, body, {
        type: 'access_pending',
        userId: String(pendingUserId),
        linkPath,
      });
    } catch (err) {
      console.error('[familyAccessNotify] pending push error:', err.message);
    }
  }

  let admins;
  try {
    admins = await getActiveAdminContacts();
  } catch (err) {
    console.error('[familyAccessNotify] admin contacts error:', err.message);
    return;
  }

  const emailSubject = `Jagiri's Kutumbam — approval needed for ${who}`;
  const emailText = [
    `${who} just registered and is waiting for family access approval.`,
    pendingEmail ? `Email: ${pendingEmail}` : null,
    pendingUsername ? `Username: ${pendingUsername}` : null,
    '',
    `Review and approve here: ${approveUrl}`,
    '',
    '— Jagiri\'s Kutumbam',
  ]
    .filter((line) => line != null)
    .join('\n');
  const emailHtml = `
    <div style="font-family:Segoe UI,Arial,sans-serif;line-height:1.5;color:#0f172a">
      <p><strong>${escapeHtml(who)}</strong> just registered and is waiting for family access approval.</p>
      <ul style="padding-left:18px">
        ${pendingUsername ? `<li>Username: <strong>${escapeHtml(pendingUsername)}</strong></li>` : ''}
        ${pendingEmail ? `<li>Email: <strong>${escapeHtml(pendingEmail)}</strong></li>` : ''}
      </ul>
      <p><a href="${approveUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600">Review pending users</a></p>
      <p style="font-size:12px;color:#64748b">If the button does not work, open:<br/>${escapeHtml(approveUrl)}</p>
      <p style="font-size:12px;color:#64748b">— Jagiri's Kutumbam</p>
    </div>`;

  for (const admin of admins) {
    if (Number(admin.id) === Number(pendingUserId)) continue;
    const to = admin.email && String(admin.email).trim();
    if (!to) continue;
    await sendAccessEmail({ to, subject: emailSubject, text: emailText, html: emailHtml });
  }
}

/**
 * After admin Approve: notify the member (bell + push + email).
 */
async function notifyUserOfFamilyAccessApproved({
  userId,
  approvedByUsername,
}) {
  if (!userId) return;

  await ensureNotificationSchema();
  const familyId = await findSharedFamilyId();
  if (familyId == null) {
    console.warn('[familyAccessNotify] no shared family for approved notify');
    return;
  }

  const user = await getUserContact(userId);
  if (!user) return;

  const who = displayNameFromRow(user, user.username);
  const type = 'access_approved';
  const title = 'Family access approved';
  const body = approvedByUsername
    ? `Welcome — ${approvedByUsername} approved your access to Jagiri's Kutumbam. You can now use all family modules.`
    : `Welcome — your access to Jagiri's Kutumbam was approved. You can now use all family modules.`;
  const linkPath = '/';
  const referenceKey = `access_approved-${userId}`;

  try {
    const dup = await db.query(
      `SELECT 1 FROM user_notifications
       WHERE user_id = $1::integer AND type = $2 AND reference_key = $3 LIMIT 1`,
      [Number(userId), type, referenceKey]
    );
    if (dup.rows.length === 0) {
      await db.query(
        `INSERT INTO user_notifications (
           user_id, family_id, type, title, body,
           entity_type, entity_id, link_path, actor_user_id, reference_key
         ) VALUES ($1, $2, $3, $4, $5, 'user', $1, $6, NULL, $7)`,
        [Number(userId), Number(familyId), type, title, body, linkPath, referenceKey]
      );
    }
  } catch (err) {
    console.error('[familyAccessNotify] approved bell error:', err.message);
  }

  try {
    await sendToUsers([Number(userId)], type, referenceKey, title, body, {
      type,
      userId: String(userId),
      linkPath,
    });
  } catch (err) {
    console.error('[familyAccessNotify] approved push error:', err.message);
  }

  const to = user.email && String(user.email).trim();
  if (!to) return;

  const dashboardUrl = `${appBaseUrl()}/`;
  const emailSubject = `Jagiri's Kutumbam — your family access was approved`;
  const emailText = [
    `Hi ${who},`,
    '',
    body,
    '',
    `Open the app: ${dashboardUrl}`,
    '',
    '— Jagiri\'s Kutumbam',
  ].join('\n');
  const emailHtml = `
    <div style="font-family:Segoe UI,Arial,sans-serif;line-height:1.5;color:#0f172a">
      <p>Hi <strong>${escapeHtml(who)}</strong>,</p>
      <p>${escapeHtml(body)}</p>
      <p><a href="${dashboardUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600">Open dashboard</a></p>
      <p style="font-size:12px;color:#64748b">— Jagiri's Kutumbam</p>
    </div>`;

  await sendAccessEmail({ to, subject: emailSubject, text: emailText, html: emailHtml });
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function scheduleNotifyAdminsOfPendingRegistration(payload) {
  setImmediate(() => {
    notifyAdminsOfPendingRegistration(payload).catch((err) => {
      console.error('[familyAccessNotify] pending fan-out error:', err.message);
    });
  });
}

function scheduleNotifyUserOfFamilyAccessApproved(payload) {
  setImmediate(() => {
    notifyUserOfFamilyAccessApproved(payload).catch((err) => {
      console.error('[familyAccessNotify] approved fan-out error:', err.message);
    });
  });
}

module.exports = {
  notifyAdminsOfPendingRegistration,
  notifyUserOfFamilyAccessApproved,
  scheduleNotifyAdminsOfPendingRegistration,
  scheduleNotifyUserOfFamilyAccessApproved,
};
