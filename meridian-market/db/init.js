// db/init.js — create tables + seed data from db/schema.sql
// Usage: npm run db:init   (reads connection settings from .env)
const fs   = require('fs');
const path = require('path');
const pool = require('./pool');

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  try {
    await pool.query(sql);
    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM products');
    console.log(`Database ready — ${rows[0].n} products seeded.`);
    console.log('Test login: test@meridian.com / password123');
  } catch (err) {
    console.error('Database init failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
