/**
 * Transactional email for password-reset OTP only.
 *
 * Resend (recommended): RESEND_API_KEY + RESEND_FROM or EMAIL_FROM.
 *   Use a verified domain to email any user. onboarding@resend.dev only delivers to your Resend signup email.
 *
 * SMTP fallback for OTP only when RESEND_API_KEY is unset (SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_FROM).
 * Occasion wishes use a separate channel: backend/lib/smtpWishSend.js (WISH_EMAIL_FROM + SMTP_*).
 */
const nodemailer = require('nodemailer');

function fromAddress() {
  return process.env.RESEND_FROM || process.env.EMAIL_FROM || '';
}

function hasResendKey() {
  return Boolean(process.env.RESEND_API_KEY && String(process.env.RESEND_API_KEY).trim());
}

function isOtpMailConfigured() {
  const from = fromAddress().trim();
  if (!from) return false;
  if (hasResendKey()) return true;
  const host = process.env.SMTP_HOST && String(process.env.SMTP_HOST).trim();
  const user = process.env.SMTP_USER && String(process.env.SMTP_USER).trim();
  const pass = process.env.SMTP_PASS != null && String(process.env.SMTP_PASS).trim() !== '';
  return Boolean(host && user && pass);
}

async function sendViaResend({ to, subject, html, text }) {
  const key = String(process.env.RESEND_API_KEY || '').trim();
  const from = fromAddress().trim();
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  });
  const body = await res.text();
  if (!res.ok) {
    const err = new Error(`Resend API error ${res.status}: ${body.slice(0, 200)}`);
    err.statusCode = res.status === 429 ? 429 : 502;
    if (/onboarding@resend\.dev/i.test(from) || /@resend\.dev/i.test(from)) {
      err.userMessage =
        'Resend test address (onboarding@resend.dev) can only send to your own Resend account email, not other users. Add and verify a domain at resend.com/domains, then set RESEND_FROM to an address on that domain (e.g. noreply@yourdomain.com).';
    } else {
      let apiMsg = '';
      try {
        const j = JSON.parse(body);
        if (j && typeof j.message === 'string') apiMsg = j.message.slice(0, 280);
      } catch {
        /* ignore */
      }
      err.userMessage =
        apiMsg ||
        'Could not send email. Check RESEND_API_KEY, RESEND_FROM / domain verification, and your Resend dashboard logs.';
    }
    throw err;
  }
  return body;
}

async function sendViaSmtp({ to, subject, html, text }) {
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: String(process.env.SMTP_PASS || ''),
    },
  });
  await transporter.sendMail({
    from: fromAddress(),
    to,
    subject,
    text,
    html,
  });
}

/**
 * @param {{ to: string, otp: string, minutesValid: number }} opts
 */
async function sendPasswordResetOtpEmail({ to, otp, minutesValid }) {
  if (!isOtpMailConfigured()) {
    const err = new Error('Email is not configured for OTP delivery');
    err.statusCode = 503;
    throw err;
  }
  const subject = 'Your password reset code';
  const text = `Your password reset code is: ${otp}\n\nIt expires in ${minutesValid} minutes. If you did not request this, ignore this email.`;
  const html = `<p>Your password reset code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${otp}</p><p>This code expires in <strong>${minutesValid}</strong> minutes.</p><p>If you did not request a password reset, you can ignore this message.</p>`;

  if (hasResendKey()) {
    await sendViaResend({ to, subject, html, text });
    return;
  }
  await sendViaSmtp({ to, subject, html, text });
}

module.exports = {
  isOtpMailConfigured,
  sendPasswordResetOtpEmail,
  fromAddress,
};
