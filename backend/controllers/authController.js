const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { ensureUserHasDefaultFamily } = require('../lib/familyAccess');
const { isOtpMailConfigured, sendPasswordResetOtpEmail } = require('../lib/emailSend');

function sha256Token(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function maskEmail(email) {
  const s = String(email || '').trim();
  const at = s.indexOf('@');
  if (at < 1) return '***';
  const local = s.slice(0, at);
  const domain = s.slice(at + 1);
  const vis = local.length <= 2 ? local[0] || '*' : `${local.slice(0, 2)}…`;
  return `${vis}@${domain}`;
}

function generateSixDigitOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

const { JWT_SECRET, JWT_EXPIRY } = require('../lib/jwtConfig');
const OTP_EXPIRY_MINUTES = Math.min(60, Math.max(5, parseInt(process.env.PASSWORD_RESET_OTP_MINUTES || '15', 10) || 15));

const GENDER_VALUES = ['female', 'male', 'non_binary', 'other', 'prefer_not_to_say'];

// Password: min 6 chars; allows letters, numbers, and special characters
exports.validateRegister = [
  body('username').trim().isLength({ min: 2 }).withMessage('Username at least 2 characters'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters (letters, numbers, special characters allowed)'),
  body('confirm_password')
    .notEmpty()
    .withMessage('Confirm password required')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match'),
  body('first_name').trim().isLength({ min: 1, max: 120 }).withMessage('First name is required (max 120 characters)'),
  body('last_name').trim().isLength({ min: 1, max: 120 }).withMessage('Last name is required (max 120 characters)'),
  body('gender')
    .optional({ checkFalsy: true })
    .isIn(GENDER_VALUES)
    .withMessage('Invalid gender selection'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 64 })
    .withMessage('Phone too long'),
  body('date_of_birth')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Invalid date of birth'),
];

exports.validateLogin = [
  body('username').trim().notEmpty().withMessage('Username required'),
  body('password').notEmpty().withMessage('Password required'),
];

exports.validateForgotPassword = [
  body('identifier').trim().notEmpty().withMessage('Enter your username or email'),
];

exports.validateResetPassword = [
  body('token').trim().notEmpty().withMessage('Reset token required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('confirm_password')
    .notEmpty()
    .withMessage('Confirm password required')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match'),
];

exports.validateResetPasswordOtp = [
  body('identifier').trim().notEmpty().withMessage('Username or email required'),
  body('otp')
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('Enter the 6-digit code from your email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('confirm_password')
    .notEmpty()
    .withMessage('Confirm password required')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match'),
];

exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const {
      username,
      email,
      password,
      first_name,
      last_name,
      gender,
      phone,
      date_of_birth,
    } = req.body;
    const hashed = await bcrypt.hash(String(password), 10);
    const firstName = String(first_name || '').trim();
    const lastName = String(last_name || '').trim();
    const genderVal = gender ? String(gender).trim() : null;
    const phoneVal = phone != null && String(phone).trim() !== '' ? String(phone).trim() : null;
    const dobVal =
      date_of_birth != null && String(date_of_birth).trim() !== ''
        ? String(date_of_birth).trim().slice(0, 10)
        : null;

    let result;
    try {
      result = await db.query(
        `INSERT INTO users (username, email, password, is_admin, first_name, last_name, gender, phone, date_of_birth)
         VALUES ($1, $2, $3, false, $4, $5, $6, $7, $8)
         RETURNING id, username, email, created_at, COALESCE(is_admin, false) AS is_admin,
           first_name, last_name, gender, phone, date_of_birth`,
        [username, email, hashed, firstName, lastName, genderVal, phoneVal, dobVal]
      );
    } catch (err) {
      if (err.code === '42703') {
        try {
          result = await db.query(
            `INSERT INTO users (username, email, password, is_admin)
             VALUES ($1, $2, $3, false)
             RETURNING id, username, email, created_at, COALESCE(is_admin, false) AS is_admin`,
            [username, email, hashed]
          );
        } catch (err2) {
          if (err2.code === '42703') {
            result = await db.query(
              'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
              [username, email, hashed]
            );
            result.rows[0].is_admin = false;
          } else throw err2;
        }
      } else throw err;
    }
    const user = result.rows[0];
    await ensureUserHasDefaultFamily(user.id, user.username);
    const isAdmin = user.is_admin === true || user.username === 'nithun';
    const token = jwt.sign({ id: user.id, username: user.username, isAdmin }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    res.status(201).json({ token, user: { id: user.id, username: user.username, email: user.email, isAdmin, first_name: null, last_name: null } });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Username or email already exists' });
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, password } = req.body;
    const loginSelects = [
      'id, username, email, password, COALESCE(is_admin, false) AS is_admin, first_name, last_name, profile_photo',
      'id, username, email, password, COALESCE(is_admin, false) AS is_admin, first_name, last_name',
      'id, username, email, password, COALESCE(is_admin, false) AS is_admin',
      'id, username, email, password',
    ];
    let result;
    let lastSelectErr;
    for (const cols of loginSelects) {
      try {
        result = await db.query(`SELECT ${cols} FROM users WHERE username = $1`, [username]);
        break;
      } catch (err) {
        lastSelectErr = err;
        if (err.code !== '42703') throw err;
      }
    }
    if (!result) throw lastSelectErr;
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(String(password), user.password)))
      return res.status(401).json({ error: 'Invalid username or password' });

    try {
      const st = await db.query('SELECT COALESCE(is_active, true) AS a FROM users WHERE id = $1', [user.id]);
      if (st.rows[0] && st.rows[0].a === false) {
        return res.status(403).json({ error: 'This account is disabled. Contact an administrator.' });
      }
    } catch (e) {
      if (e.code !== '42703') throw e;
    }

    await ensureUserHasDefaultFamily(user.id, user.username);
    const isAdmin = user.is_admin === true || user.username === 'nithun';
    const token = jwt.sign({ id: user.id, username: user.username, isAdmin }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin,
        first_name: user.first_name || null,
        last_name: user.last_name || null,
        profile_photo: user.profile_photo ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
};

async function storeOtpForUser(userId, otpHash, expiresAtIso) {
  await db.query('DELETE FROM password_reset_otp WHERE user_id = $1', [userId]);
  await db.query(
    'INSERT INTO password_reset_otp (user_id, otp_hash, expires_at, attempts_remaining) VALUES ($1, $2, $3, 5)',
    [userId, otpHash, expiresAtIso]
  );
}

exports.forgotPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const identifier = String(req.body.identifier || '').trim();
    const vagueNoAccount =
      'If an account exists for that username or email, we sent a 6-digit verification code to the address on file.';

    let userResult;
    try {
      userResult = await db.query(
        `SELECT id, username, email FROM users
         WHERE LOWER(TRIM(username)) = LOWER(TRIM($1)) OR LOWER(TRIM(email)) = LOWER(TRIM($1))`,
        [identifier]
      );
    } catch (err) {
      return next(err);
    }

    const user = userResult.rows[0];
    if (!user) {
      return res.json({ message: vagueNoAccount });
    }

    const otp = generateSixDigitOtp();
    const otpHash = sha256Token(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    try {
      await storeOtpForUser(user.id, otpHash, expiresAt.toISOString());
    } catch (err) {
      if (err.code === '42P01') {
        return res.status(503).json({
          error:
            'Password reset OTP is not set up yet. Run backend/database/add-password-reset-otp.sql on your database.',
        });
      }
      throw err;
    }

    const isProd = process.env.NODE_ENV === 'production';
    const mailConfigured = isOtpMailConfigured();

    if (mailConfigured) {
      try {
        await sendPasswordResetOtpEmail({
          to: user.email,
          otp,
          minutesValid: OTP_EXPIRY_MINUTES,
        });
      } catch (sendErr) {
        await db.query('DELETE FROM password_reset_otp WHERE user_id = $1', [user.id]);
        const code = sendErr.statusCode === 429 ? 429 : 502;
        const default502 =
          'Could not send email. Check RESEND_API_KEY / SMTP settings and your provider logs.';
        return res.status(code).json({
          error:
            sendErr.statusCode === 429
              ? 'Email sending limit reached. Try again later or check your provider usage dashboard.'
              : sendErr.userMessage || default502,
        });
      }
      return res.json({
        message: `We sent a 6-digit code to ${maskEmail(user.email)}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
        maskedEmail: maskEmail(user.email),
        otpDelivery: 'email',
      });
    }

    const devOtpEnabled = process.env.PASSWORD_RESET_DEV_OTP !== '0';
    if (!isProd && devOtpEnabled) {
      return res.json({
        message: `Email is not configured; development mode shows the code here. Code sent to ${maskEmail(user.email)} would be:`,
        maskedEmail: maskEmail(user.email),
        otpDelivery: 'dev',
        devOtp: otp,
      });
    }

    await db.query('DELETE FROM password_reset_otp WHERE user_id = $1', [user.id]);
    return res.json({
      message:
        'Password reset by email is not configured on this server (set RESEND_API_KEY or SMTP_* and EMAIL_FROM). Contact your administrator.',
    });
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { token, password } = req.body;
    const tokenHash = sha256Token(token);

    let lookup;
    try {
      lookup = await db.query(
        `SELECT user_id FROM password_reset_tokens WHERE token_hash = $1 AND expires_at > NOW()`,
        [tokenHash]
      );
    } catch (err) {
      if (err.code === '42P01') {
        return res.status(503).json({
          error:
            'Password reset is not set up yet. Ask your administrator to run backend/database/add-password-reset-tokens.sql.',
        });
      }
      throw err;
    }

    const row = lookup.rows[0];
    if (!row) return res.status(400).json({ error: 'Invalid or expired reset link. Request a new one from Forgot password.' });

    const hashed = await bcrypt.hash(String(password), 10);
    await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, row.user_id]);
    await db.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [row.user_id]);

    res.json({ message: 'Password updated. You can log in with your new password.' });
  } catch (err) {
    next(err);
  }
};

exports.resetPasswordWithOtp = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { identifier, otp, password } = req.body;
    const otpHash = sha256Token(String(otp).trim());

    let userResult;
    try {
      userResult = await db.query(
        `SELECT id FROM users
         WHERE LOWER(TRIM(username)) = LOWER(TRIM($1)) OR LOWER(TRIM(email)) = LOWER(TRIM($1))`,
        [identifier]
      );
    } catch (err) {
      return next(err);
    }

    const user = userResult.rows[0];
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired code. Request a new code from Forgot password.' });
    }

    let otpRowResult;
    try {
      otpRowResult = await db.query(
        `SELECT id, otp_hash, attempts_remaining FROM password_reset_otp
         WHERE user_id = $1 AND expires_at > NOW()`,
        [user.id]
      );
    } catch (err) {
      if (err.code === '42P01') {
        return res.status(503).json({
          error: 'Password reset OTP is not set up. Run backend/database/add-password-reset-otp.sql.',
        });
      }
      throw err;
    }

    const otpRow = otpRowResult.rows[0];
    if (!otpRow) {
      return res.status(400).json({ error: 'Invalid or expired code. Request a new code from Forgot password.' });
    }

    if (otpRow.otp_hash !== otpHash) {
      const left = Math.max(0, (otpRow.attempts_remaining || 1) - 1);
      if (left <= 0) {
        await db.query('DELETE FROM password_reset_otp WHERE id = $1', [otpRow.id]);
        return res.status(400).json({ error: 'Too many incorrect attempts. Request a new code from Forgot password.' });
      }
      await db.query('UPDATE password_reset_otp SET attempts_remaining = $1 WHERE id = $2', [left, otpRow.id]);
      return res.status(400).json({ error: `Invalid code. ${left} attempt(s) left.` });
    }

    const hashed = await bcrypt.hash(String(password), 10);
    await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, user.id]);
    await db.query('DELETE FROM password_reset_otp WHERE user_id = $1', [user.id]);
    await db.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);

    res.json({ message: 'Password updated. You can log in with your new password.' });
  } catch (err) {
    next(err);
  }
};
