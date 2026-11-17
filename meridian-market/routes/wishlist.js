// routes/wishlist.js — saved items
const express = require('express');
const pool    = require('../db/pool');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();
router.use(requireLogin);

// GET /api/wishlist
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.name, p.price::float AS price, p.original_price::float AS original_price,
              p.emoji, p.tint, p.badge, p.avg_rating::float AS avg_rating, p.review_count,
              c.name AS category
       FROM wishlist w JOIN products p ON p.id = w.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE w.user_id = $1 ORDER BY w.added_at DESC`, [req.session.userId]
    );
    res.json({ products: rows, ids: rows.map(r => r.id) });
  } catch (err) { next(err); }
});

// POST /api/wishlist/:productId — toggle
router.post('/:productId', async (req, res, next) => {
  const pid = parseInt(req.params.productId);
  if (!pid) return res.status(400).json({ error: 'Invalid product id.' });
  try {
    const del = await pool.query(
      'DELETE FROM wishlist WHERE user_id = $1 AND product_id = $2', [req.session.userId, pid]
    );
    if (del.rowCount) return res.json({ saved: false });
    await pool.query(
      `INSERT INTO wishlist (user_id, product_id)
       SELECT $1, id FROM products WHERE id = $2`, [req.session.userId, pid]
    );
    res.json({ saved: true });
  } catch (err) { next(err); }
});

module.exports = router;
