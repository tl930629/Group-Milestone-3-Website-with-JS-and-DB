// routes/auth.js — register, login, logout, session status
const express = require('express');
const bcrypt  = require('bcrypt');
const pool    = require('../db/pool');
const { requireGuest } = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function startSession(req, user, remember = true) {
  return new Promise((resolve, reject) => {
    // regenerate() prevents session-fixation attacks
    req.session.regenerate(err => {
      if (err) return reject(err);
      req.session.userId   = user.id;
      req.session.fullName = user.full_name;
      req.session.email    = user.email;
      // "Keep me logged in" unchecked → cookie ends when the browser closes
      if (!remember) req.session.cookie.expires = false;
      req.session.save(e => (e ? reject(e) : resolve()));
    });
  });
}

// POST /api/auth/register
router.post('/register', requireGuest, async (req, res, next) => {
  const full_name = (req.body.full_name || '').trim();
  const email     = (req.body.email || '').trim().toLowerCase();
  const password  = req.body.password || '';

  if (!full_name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required.' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (password.length < 8 || !/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
    return res.status(400).json({ error: 'Password needs 8+ characters with letters and numbers.' });
  }

  try {
    const exists = await pool.query('SELECT 1 FROM users WHERE email = $1', [email]);
    if (exists.rowCount) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const { rows } = await pool.query(
      `INSERT INTO users (full_name, email, password_hash)
       VALUES ($1, $2, $3) RETURNING id, full_name, email`,
      [full_name, email, hash]
    );
    await startSession(req, rows[0]);
    res.status(201).json({ success: true, user: rows[0] });
  } catch (err) { next(err); }
});

// POST /api/auth/login
router.post('/login', requireGuest, async (req, res, next) => {
  const email    = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  try {
    const { rows } = await pool.query(
      'SELECT id, full_name, email, password_hash FROM users WHERE email = $1', [email]
    );
    const user = rows[0];
    const ok = user && await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Incorrect email or password.' });

    await startSession(req, user, req.body.remember !== false);
    res.json({ success: true, user: { id: user.id, full_name: user.full_name, email: user.email } });
  } catch (err) { next(err); }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Could not log out.' });
    res.clearCookie('meridian.sid');
    res.json({ success: true });
  });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (req.session && req.session.userId) {
    return res.json({
      loggedIn: true,
      user: { id: req.session.userId, full_name: req.session.fullName, email: req.session.email },
    });
  }
  res.json({ loggedIn: false });
});

module.exports = router;
