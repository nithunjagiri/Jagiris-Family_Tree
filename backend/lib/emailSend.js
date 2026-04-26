/**
 * Transactional email for password-reset OTP.
 *
 * Configure either Resend (recommended) or SMTP:
 * - Resend: RESEND_API_KEY, and RESEND_FROM or EMAIL_FROM
 *   Use a verified domain (e.g. noreply@yourdomain.com) to email any user.
 *   onboarding@resend.dev only delivers to your Resend signup email (not other accounts).
 * - SMTP: SMTP_HOST, SMTP_PORT (optional, default 587), SMTP_USER, SMTP_PASS, EMAIL_FROM
 *
 * Usage / quotas: check your provider dashboard (e.g. resend.com → Usage) or API response headers
 * (Resend sends x-resend-daily-quota / x-resend-monthly-quota on some responses).
 */
const nodemailer = require('nodemailer');

function fromAddress() {
  return process.env.RESEND_FROM || process.env.EMAIL_FROM || '';
}

function isOtpMailConfigured() {
  const from = fromAddress().trim();
  if (!from) return false;
  if (process.env.RESEND_API_KEY && String(process.env.RESEND_API_KEY).trim()) return true;
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

  if (process.env.RESEND_API_KEY && String(process.env.RESEND_API_KEY).trim()) {
    await sendViaResend({ to, subject, html, text });
  } else {
    await sendViaSmtp({ to, subject, html, text });
  }
}

module.exports = {
  isOtpMailConfigured,
  sendPasswordResetOtpEmail,
  fromAddress,
};
