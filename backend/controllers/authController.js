const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_EXPIRY = '7d';

// Password: min 6 chars; allows letters, numbers, and special characters
exports.validateRegister = [
  body('username').trim().isLength({ min: 2 }).withMessage('Username at least 2 characters'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters (letters, numbers, special characters allowed)'),
];

exports.validateLogin = [
  body('username').trim().notEmpty().withMessage('Username required'),
  body('password').notEmpty().withMessage('Password required'),
];

exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, email, password } = req.body;
    const hashed = await bcrypt.hash(String(password), 10);

    const result = await db.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
      [username, email, hashed]
    );
    const user = result.rows[0];
    const isAdmin = user.username === 'nithun';
    const token = jwt.sign({ id: user.id, username: user.username, isAdmin }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    res.status(201).json({ token, user: { id: user.id, username: user.username, email: user.email, isAdmin } });
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
    const result = await db.query('SELECT id, username, email, password FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(String(password), user.password)))
      return res.status(401).json({ error: 'Invalid username or password' });

    const isAdmin = user.username === 'nithun';
    const token = jwt.sign({ id: user.id, username: user.username, isAdmin }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, isAdmin } });
  } catch (err) {
    next(err);
  }
};
