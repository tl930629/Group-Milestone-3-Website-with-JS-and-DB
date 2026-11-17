// routes/orders.js — checkout + order history
const express = require('express');
const pool    = require('../db/pool');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();
router.use(requireLogin);

const TAX_RATE = 0.08625; // San Francisco sales tax
const SHIPPING = { standard: 5.99, express: 14.99, pickup: 0 };
const FREE_SHIPPING_OVER = 50;
const PROMOS = { MERIDIAN10: 0.10, WELCOME15: 0.15 };
const round2 = n => Math.round(n * 100) / 100;

function priceOrder(subtotal, method, promo) {
  let shipping = SHIPPING[method] ?? SHIPPING.standard;
  if (method === 'standard' && subtotal >= FREE_SHIPPING_OVER) shipping = 0;
  const rate = PROMOS[(promo || '').toUpperCase()] || 0;
  const discount = round2(subtotal * rate);
  const tax = round2((subtotal - discount) * TAX_RATE);
  const total = round2(subtotal - discount + shipping + tax);
  return { subtotal: round2(subtotal), shipping, discount, tax, total };
}

// POST /api/orders/quote { shipping_method, promo } — price preview
router.post('/quote', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT ci.quantity, p.price::float AS price FROM cart_items ci
       JOIN products p ON p.id = ci.product_id WHERE ci.user_id = $1`,
      [req.session.userId]
    );
    const subtotal = rows.reduce((s, i) => s + i.price * i.quantity, 0);
    const promo = (req.body.promo || '').toUpperCase();
    res.json({ ...priceOrder(subtotal, req.body.shipping_method, promo),
               promoValid: !promo || !!PROMOS[promo] });
  } catch (err) { next(err); }
});

// POST /api/orders — place order from current cart
router.post('/', async (req, res, next) => {
  const b = req.body;
  const required = ['ship_name', 'ship_address', 'ship_city', 'ship_zip'];
  for (const f of required) {
    if (!b[f] || !String(b[f]).trim()) {
      return res.status(400).json({ error: 'Please complete your shipping details.' });
    }
  }
  const card = String(b.card_number || '').replace(/\D/g, '');
  // Demo checkout: the full card number is never stored — only the last 4 digits.
  if (card.length < 12 || card.length > 19) {
    return res.status(400).json({ error: 'Please enter a valid card number.' });
  }

  const userId = req.session.userId;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const cart = await client.query(
      `SELECT ci.product_id, ci.quantity, p.name, p.price::float AS price, p.stock
       FROM cart_items ci JOIN products p ON p.id = ci.product_id
       WHERE ci.user_id = $1 FOR UPDATE OF p`,
      [userId]
    );
    if (!cart.rowCount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Your cart is empty.' });
    }
    for (const it of cart.rows) {
      if (it.stock < it.quantity) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: `Only ${it.stock} left of “${it.name}”.` });
      }
    }

    const subtotal = cart.rows.reduce((s, i) => s + i.price * i.quantity, 0);
    const method = SHIPPING[b.shipping_method] !== undefined ? b.shipping_method : 'standard';
    const q = priceOrder(subtotal, method, b.promo);

    const order = await client.query(
      `INSERT INTO orders (user_id, status, subtotal, shipping_cost, discount, tax, total,
                           shipping_method, ship_name, ship_address, ship_city, ship_zip, card_last4)
       VALUES ($1,'confirmed',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id, created_at`,
      [userId, q.subtotal, q.shipping, q.discount, q.tax, q.total, method,
       b.ship_name.trim(), b.ship_address.trim(), b.ship_city.trim(), b.ship_zip.trim(),
       card.slice(-4)]
    );
    const orderId = order.rows[0].id;

    for (const it of cart.rows) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
         VALUES ($1,$2,$3,$4)`, [orderId, it.product_id, it.quantity, it.price]
      );
      await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2',
        [it.quantity, it.product_id]);
    }
    await client.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
    await client.query('COMMIT');
    res.status(201).json({ success: true, orderId, ...q });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// GET /api/orders — history
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT o.id, o.status, o.total::float AS total, o.created_at, o.shipping_method,
              COALESCE(SUM(oi.quantity),0)::int AS item_count,
              STRING_AGG(p.emoji, '' ORDER BY oi.id) AS emojis
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE o.user_id = $1
       GROUP BY o.id ORDER BY o.created_at DESC`,
      [req.session.userId]
    );
    res.json({ orders: rows });
  } catch (err) { next(err); }
});

// GET /api/orders/:id — detail
router.get('/:id', async (req, res, next) => {
  try {
    const o = await pool.query(
      `SELECT id, status, subtotal::float, shipping_cost::float, discount::float, tax::float,
              total::float, shipping_method, ship_name, ship_address, ship_city, ship_zip,
              card_last4, created_at
       FROM orders WHERE id = $1 AND user_id = $2`,
      [parseInt(req.params.id), req.session.userId]
    );
    if (!o.rowCount) return res.status(404).json({ error: 'Order not found.' });
    const items = await pool.query(
      `SELECT oi.product_id, oi.quantity, oi.unit_price::float AS unit_price,
              p.name, p.emoji, p.tint
       FROM order_items oi JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $1`, [o.rows[0].id]
    );
    res.json({ order: o.rows[0], items: items.rows });
  } catch (err) { next(err); }
});

module.exports = router;
