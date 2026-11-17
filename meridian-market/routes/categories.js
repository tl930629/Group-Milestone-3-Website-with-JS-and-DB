// routes/categories.js — category list with product counts
const express = require('express');
const pool    = require('../db/pool');

const router = express.Router();

// GET /api/categories
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.name, c.slug, c.emoji, COUNT(p.id)::int AS product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id
       GROUP BY c.id
       ORDER BY c.id`
    );
    res.json({ categories: rows });
  } catch (err) { next(err); }
});

module.exports = router;
