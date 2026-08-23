/**
 * Gmail SMTP for occasion wish emails only (not password-reset OTP).
 *
 * Configure: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, WISH_EMAIL_FROM
 * Do not set EMAIL_FROM to Gmail — OTP uses RESEND_FROM via emailSend.js.
 */
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const LOGO_CID = 'kutumbam-logo';
const LOGO_PATH = path.join(__dirname, '..', 'assets', 'email-logo.png');
const SEND_TIMEOUT_MS = 20_000;

let transporter = null;

function wishFromAddress() {
  const wishFrom = process.env.WISH_EMAIL_FROM && String(process.env.WISH_EMAIL_FROM).trim();
  if (wishFrom) return wishFrom;
  const user = process.env.SMTP_USER && String(process.env.SMTP_USER).trim();
  return user || '';
}

function isWishMailConfigured() {
  const host = process.env.SMTP_HOST && String(process.env.SMTP_HOST).trim();
  const user = process.env.SMTP_USER && String(process.env.SMTP_USER).trim();
  const pass = process.env.SMTP_PASS != null && String(process.env.SMTP_PASS).trim() !== '';
  const from = wishFromAddress();
  return Boolean(host && user && pass && from);
}

function getTransporter() {
  if (transporter) return transporter;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: String(process.env.SMTP_PASS || ''),
    },
  });
  return transporter;
}

function logoAttachment() {
  if (!fs.existsSync(LOGO_PATH)) return null;
  return {
    filename: 'email-logo.png',
    path: LOGO_PATH,
    cid: LOGO_CID,
  };
}

/**
 * @param {{ to: string, subject: string, text: string, html: string }} opts
 * @returns {Promise<{ skipped?: boolean }>}
 */
async function sendWishEmail({ to, subject, text, html }) {
  if (!isWishMailConfigured()) {
    return { skipped: true };
  }

  const mailOptions = {
    from: wishFromAddress(),
    to,
    subject,
    text,
    html,
  };

  const attachment = logoAttachment();
  if (attachment) {
    mailOptions.attachments = [attachment];
  }

  const transport = getTransporter();
  await Promise.race([
    transport.sendMail(mailOptions),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Wish email SMTP timeout')), SEND_TIMEOUT_MS);
    }),
  ]);

  return {};
}

module.exports = {
  isWishMailConfigured,
  sendWishEmail,
  LOGO_CID,
};
