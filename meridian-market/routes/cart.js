// routes/cart.js — server-side cart for logged-in users
const express = require('express');
const pool    = require('../db/pool');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();
router.use(requireLogin);

async function loadCart(userId) {
  const { rows } = await pool.query(
    `SELECT ci.id, ci.product_id, ci.quantity, p.name, p.price::float AS price,
            p.emoji, p.tint, p.stock
     FROM cart_items ci JOIN products p ON ci.product_id = p.id
     WHERE ci.user_id = $1 ORDER BY ci.added_at DESC, ci.id DESC`,
    [userId]
  );
  const subtotal = rows.reduce((s, i) => s + i.price * i.quantity, 0);
  return {
    items: rows,
    count: rows.reduce((s, i) => s + i.quantity, 0),
    subtotal: Math.round(subtotal * 100) / 100,
  };
}

// GET /api/cart
router.get('/', async (req, res, next) => {
  try { res.json(await loadCart(req.session.userId)); } catch (err) { next(err); }
});

// POST /api/cart  { product_id, quantity }
router.post('/', async (req, res, next) => {
  const productId = parseInt(req.body.product_id);
  const qty = Math.max(1, parseInt(req.body.quantity) || 1);
  if (!productId) return res.status(400).json({ error: 'product_id is required.' });
  try {
    const p = await pool.query('SELECT stock FROM products WHERE id = $1', [productId]);
    if (!p.rowCount) return res.status(404).json({ error: 'Product not found.' });
    await pool.query(
      `INSERT INTO cart_items (user_id, product_id, quantity)
       VALUES ($1, $2, LEAST($3, $4::int))
       ON CONFLICT (user_id, product_id)
       DO UPDATE SET quantity = LEAST(cart_items.quantity + $3, $4::int)`,
      [req.session.userId, productId, qty, Math.max(1, p.rows[0].stock)]
    );
    res.status(201).json(await loadCart(req.session.userId));
  } catch (err) { next(err); }
});

// POST /api/cart/merge  { items: [{product_id, quantity}] } — after login
router.post('/merge', async (req, res, next) => {
  const items = Array.isArray(req.body.items) ? req.body.items.slice(0, 50) : [];
  try {
    for (const it of items) {
      const pid = parseInt(it.product_id);
      const qty = Math.max(1, parseInt(it.quantity) || 1);
      if (!pid) continue;
      await pool.query(
        `INSERT INTO cart_items (user_id, product_id, quantity)
         SELECT $1, id, LEAST($3, GREATEST(stock,1)) FROM products WHERE id = $2
         ON CONFLICT (user_id, product_id)
         DO UPDATE SET quantity = LEAST(cart_items.quantity + $3, 99)`,
        [req.session.userId, pid, qty]
      );
    }
    res.json(await loadCart(req.session.userId));
  } catch (err) { next(err); }
});

// PATCH /api/cart/:id  { quantity }
router.patch('/:id', async (req, res, next) => {
  const qty = parseInt(req.body.quantity);
  if (!(qty >= 1)) return res.status(400).json({ error: 'Quantity must be at least 1.' });
  try {
    const r = await pool.query(
      `UPDATE cart_items ci SET quantity = LEAST($1, GREATEST(p.stock,1))
       FROM products p
       WHERE ci.id = $2 AND ci.user_id = $3 AND p.id = ci.product_id RETURNING ci.id`,
      [qty, parseInt(req.params.id), req.session.userId]
    );
    if (!r.rowCount) return res.status(404).json({ error: 'Cart item not found.' });
    res.json(await loadCart(req.session.userId));
  } catch (err) { next(err); }
});

// DELETE /api/cart/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM cart_items WHERE id = $1 AND user_id = $2',
      [parseInt(req.params.id), req.session.userId]);
    res.json(await loadCart(req.session.userId));
  } catch (err) { next(err); }
});

// DELETE /api/cart — clear
router.delete('/', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM cart_items WHERE user_id = $1', [req.session.userId]);
    res.json(await loadCart(req.session.userId));
  } catch (err) { next(err); }
});

module.exports = router;
