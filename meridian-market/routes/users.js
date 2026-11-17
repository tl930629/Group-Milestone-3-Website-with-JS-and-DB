// routes/users.js — profile + password
const express = require('express');
const bcrypt  = require('bcrypt');
const pool    = require('../db/pool');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();
router.use(requireLogin);

const FIELDS = 'id, full_name, email, phone, address, city, zip, created_at';

// GET /api/users/profile
router.get('/profile', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT ${FIELDS} FROM users WHERE id = $1`, [req.session.userId]);
    if (!rows.length) return res.status(404).json({ error: 'User not found.' });
    const stats = await pool.query(
      `SELECT COUNT(*)::int AS orders, COALESCE(SUM(total),0)::float AS spent
       FROM orders WHERE user_id = $1`, [req.session.userId]
    );
    res.json({ user: rows[0], stats: stats.rows[0] });
  } catch (err) { next(err); }
});

// PATCH /api/users/profile
router.patch('/profile', async (req, res, next) => {
  const full_name = (req.body.full_name || '').trim();
  if (!full_name) return res.status(400).json({ error: 'Name cannot be empty.' });
  const clean = v => (v == null ? null : String(v).trim().slice(0, 255) || null);
  try {
    const { rows } = await pool.query(
      `UPDATE users SET full_name=$1, phone=$2, address=$3, city=$4, zip=$5
       WHERE id=$6 RETURNING ${FIELDS}`,
      [full_name.slice(0, 100), clean(req.body.phone), clean(req.body.address),
       clean(req.body.city), clean(req.body.zip), req.session.userId]
    );
    req.session.fullName = rows[0].full_name;
    res.json({ success: true, user: rows[0] });
  } catch (err) { next(err); }
});

// POST /api/users/change-password
router.post('/change-password', async (req, res, next) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Both passwords are required.' });
  }
  if (new_password.length < 8 || !/\d/.test(new_password) || !/[a-zA-Z]/.test(new_password)) {
    return res.status(400).json({ error: 'New password needs 8+ characters with letters and numbers.' });
  }
  try {
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.session.userId]);
    if (!rows.length || !(await bcrypt.compare(current_password, rows[0].password_hash))) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }
    const hash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.session.userId]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
