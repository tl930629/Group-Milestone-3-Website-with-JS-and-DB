// server.js — Meridian Market
// Express + PostgreSQL + session-based authentication
require('dotenv').config();

const express   = require('express');
const path      = require('path');
const session   = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const pool      = require('./db/pool');
const { requireLogin } = require('./middleware/auth');

const app  = express();
const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');

// ── Body parsing ─────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Sessions (stored in PostgreSQL) ──────────────────────────
app.use(session({
  store: new PgSession({ pool, tableName: 'sessions', createTableIfMissing: true }),
  name: 'meridian.sid',
  secret: process.env.SESSION_SECRET || 'change_me_in_env',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    sameSite: 'lax',
  },
}));

// ── API routes ───────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/products',   require('./routes/products'));
app.use('/api/cart',       require('./routes/cart'));
app.use('/api/orders',     require('./routes/orders'));
app.use('/api/users',      require('./routes/users'));
app.use('/api/wishlist',   require('./routes/wishlist'));

// Unknown API path → JSON 404 (never the HTML page)
app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found.' }));

// ── Protected pages (server-side redirect when logged out) ──
app.get(['/account', '/account/', '/account/index.html'], requireLogin, (req, res) => {
  res.sendFile(path.join(PUBLIC, 'account', 'index.html'));
});

// ── Static front-end ─────────────────────────────────────────
app.use(express.static(PUBLIC));

// ── 404 page ─────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).sendFile(path.join(PUBLIC, '404.html'));
});

// ── Error handler ────────────────────────────────────────────
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(err);
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
  res.status(500).send('Server error');
});

// ── Start: test the DB connection, then listen ───────────────
pool.query('SELECT NOW() AS now, (SELECT COUNT(*) FROM products)::int AS products')
  .then(({ rows }) => {
    console.log(`Connected to PostgreSQL "${process.env.DB_NAME}" — ${rows[0].products} products, server time ${rows[0].now.toISOString()}`);
  })
  .catch(err => {
    console.error('Could not connect to PostgreSQL. Check your .env settings and run `npm run db:init`.');
    console.error('  ' + err.message);
  });

app.listen(PORT, () => {
  console.log(`Meridian Market running at http://localhost:${PORT}`);
});
