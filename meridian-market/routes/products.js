// routes/products.js — catalogue, search, detail, reviews
const express = require('express');
const pool    = require('../db/pool');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

const BASE_SELECT = `
  SELECT p.id, p.name, p.description, p.price::float AS price,
         p.original_price::float AS original_price, p.emoji, p.tint, p.badge,
         p.stock, p.avg_rating::float AS avg_rating, p.review_count,
         c.name AS category, c.slug AS category_slug
  FROM products p
  LEFT JOIN categories c ON p.category_id = c.id`;

const SORTS = {
  featured:   'p.review_count DESC',
  'price-asc':  'p.price ASC',
  'price-desc': 'p.price DESC',
  rating:     'p.avg_rating DESC, p.review_count DESC',
  newest:     'p.created_at DESC, p.id DESC',
  name:       'p.name ASC',
};

// GET /api/products?category=&minPrice=&maxPrice=&minRating=&sale=1&sort=&page=&limit=
router.get('/', async (req, res, next) => {
  const page  = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(48, Math.max(1, parseInt(req.query.limit) || 12));
  const orderBy = SORTS[req.query.sort] || SORTS.featured;

  const where = [];
  const vals  = [];
  const add = (sql, v) => { vals.push(v); where.push(sql.replace('?', '$' + vals.length)); };

  if (req.query.category) {
    // allow comma-separated list of slugs
    const slugs = String(req.query.category).split(',').map(s => s.trim()).filter(Boolean);
    if (slugs.length) add('c.slug = ANY(?)', slugs);
  }
  if (req.query.minPrice)  add('p.price >= ?',      parseFloat(req.query.minPrice) || 0);
  if (req.query.maxPrice)  add('p.price <= ?',      parseFloat(req.query.maxPrice) || 99999);
  if (req.query.minRating) add('p.avg_rating >= ?', parseFloat(req.query.minRating) || 0);
  if (req.query.sale === '1') where.push('p.original_price IS NOT NULL');

  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

  try {
    const [list, count] = await Promise.all([
      pool.query(
        `${BASE_SELECT} ${whereSql} ORDER BY ${orderBy}
         LIMIT $${vals.length + 1} OFFSET $${vals.length + 2}`,
        [...vals, limit, (page - 1) * limit]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS n FROM products p
         LEFT JOIN categories c ON p.category_id = c.id ${whereSql}`,
        vals
      ),
    ]);
    const total = count.rows[0].n;
    res.json({ products: list.rows, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) { next(err); }
});

// GET /api/products/featured — most-reviewed 8
router.get('/featured', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`${BASE_SELECT} ORDER BY p.review_count DESC LIMIT 8`);
    res.json({ products: rows });
  } catch (err) { next(err); }
});

// GET /api/products/deals — items on sale
router.get('/deals', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `${BASE_SELECT} WHERE p.original_price IS NOT NULL
       ORDER BY (p.original_price - p.price) DESC LIMIT 8`
    );
    res.json({ products: rows });
  } catch (err) { next(err); }
});

// GET /api/products/search?q=&sort=
router.get('/search', async (req, res, next) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ products: [], query: '' });
  const orderBy = SORTS[req.query.sort] || 'p.avg_rating DESC';
  try {
    const { rows } = await pool.query(
      `${BASE_SELECT}
       WHERE p.name ILIKE $1 OR p.description ILIKE $1 OR c.name ILIKE $1
       ORDER BY ${orderBy} LIMIT 40`,
      [`%${q}%`]
    );
    res.json({ products: rows, query: q });
  } catch (err) { next(err); }
});

// GET /api/products/:id — detail + reviews + related
router.get('/:id', async (req, res, next) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid product id.' });
  try {
    const { rows } = await pool.query(`${BASE_SELECT} WHERE p.id = $1`, [id]);
    if (!rows.length) return res.status(404).json({ error: 'Product not found.' });
    const product = rows[0];

    const [reviews, related] = await Promise.all([
      pool.query(
        `SELECT r.id, r.rating, r.comment, r.created_at, u.full_name, r.user_id
         FROM reviews r JOIN users u ON r.user_id = u.id
         WHERE r.product_id = $1 ORDER BY r.created_at DESC LIMIT 20`, [id]
      ),
      pool.query(
        `${BASE_SELECT} WHERE c.slug = $1 AND p.id <> $2
         ORDER BY p.avg_rating DESC LIMIT 4`, [product.category_slug, id]
      ),
    ]);
    res.json({ product, reviews: reviews.rows, related: related.rows });
  } catch (err) { next(err); }
});

// POST /api/products/:id/reviews — add or update your review
router.post('/:id/reviews', requireLogin, async (req, res, next) => {
  const productId = parseInt(req.params.id);
  const rating  = parseInt(req.body.rating);
  const comment = (req.body.comment || '').trim().slice(0, 1000);
  if (!productId) return res.status(400).json({ error: 'Invalid product id.' });
  if (!(rating >= 1 && rating <= 5)) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const exists = await client.query('SELECT 1 FROM products WHERE id = $1', [productId]);
    if (!exists.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Product not found.' });
    }
    // Before upserting, keep the seed "historical" counts consistent:
    // review_count stores the total number of ratings and avg_rating their mean.
    const prev = await client.query(
      'SELECT rating FROM reviews WHERE product_id = $1 AND user_id = $2',
      [productId, req.session.userId]
    );
    await client.query(
      `INSERT INTO reviews (product_id, user_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (product_id, user_id)
       DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, created_at = NOW()`,
      [productId, req.session.userId, rating, comment]
    );
    if (prev.rowCount) {
      // replace old rating inside the running average
      await client.query(
        `UPDATE products SET avg_rating =
           CASE WHEN review_count > 0
                THEN ROUND(((avg_rating * review_count) - $2 + $3) / review_count, 2)
                ELSE $3 END
         WHERE id = $1`,
        [productId, prev.rows[0].rating, rating]
      );
    } else {
      await client.query(
        `UPDATE products SET
           avg_rating   = ROUND(((avg_rating * review_count) + $2) / (review_count + 1), 2),
           review_count = review_count + 1
         WHERE id = $1`,
        [productId, rating]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ success: true, updated: prev.rowCount > 0 });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
