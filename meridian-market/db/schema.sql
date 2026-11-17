-- ============================================================
-- Meridian Market — PostgreSQL Schema + Seed Data
-- CSC 317 Group Project
-- Run:  npm run db:init   (or: psql -U <user> -d <db> -f db/schema.sql)
-- ============================================================

DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders      CASCADE;
DROP TABLE IF EXISTS cart_items  CASCADE;
DROP TABLE IF EXISTS wishlist    CASCADE;
DROP TABLE IF EXISTS reviews     CASCADE;
DROP TABLE IF EXISTS products    CASCADE;
DROP TABLE IF EXISTS categories  CASCADE;
DROP TABLE IF EXISTS users       CASCADE;
DROP TABLE IF EXISTS sessions    CASCADE;

-- ── SESSIONS (connect-pg-simple) ────────────────────────────
CREATE TABLE sessions (
  sid    VARCHAR      NOT NULL PRIMARY KEY,
  sess   JSON         NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX idx_sessions_expire ON sessions (expire);

-- ── USERS ───────────────────────────────────────────────────
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone         VARCHAR(30),
  address       VARCHAR(255),
  city          VARCHAR(100),
  zip           VARCHAR(20),
  created_at    TIMESTAMP DEFAULT NOW()
);

-- ── CATEGORIES ──────────────────────────────────────────────
CREATE TABLE categories (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(50) NOT NULL UNIQUE,
  slug  VARCHAR(50) NOT NULL UNIQUE,
  emoji VARCHAR(10) DEFAULT '🛍️'
);

-- ── PRODUCTS ────────────────────────────────────────────────
CREATE TABLE products (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(150)  NOT NULL,
  description    TEXT,
  price          NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  original_price NUMERIC(10,2),
  emoji          VARCHAR(10)   DEFAULT '📦',
  tint           VARCHAR(10)   DEFAULT '#efe9df',
  badge          VARCHAR(20),
  category_id    INT REFERENCES categories(id) ON DELETE SET NULL,
  stock          INT           DEFAULT 100 CHECK (stock >= 0),
  avg_rating     NUMERIC(3,2)  DEFAULT 0,
  review_count   INT           DEFAULT 0,
  created_at     TIMESTAMP     DEFAULT NOW()
);
CREATE INDEX idx_products_category ON products (category_id);

-- ── REVIEWS ─────────────────────────────────────────────────
CREATE TABLE reviews (
  id         SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id    INT NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  rating     INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (product_id, user_id)
);

-- ── CART ITEMS (server-side cart) ───────────────────────────
CREATE TABLE cart_items (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity   INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  added_at   TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

-- ── WISHLIST ────────────────────────────────────────────────
CREATE TABLE wishlist (
  user_id    INT NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  added_at   TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, product_id)
);

-- ── ORDERS ──────────────────────────────────────────────────
CREATE TABLE orders (
  id               SERIAL PRIMARY KEY,
  user_id          INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status           VARCHAR(20)   DEFAULT 'confirmed',
  subtotal         NUMERIC(10,2) NOT NULL,
  shipping_cost    NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount         NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax              NUMERIC(10,2) NOT NULL,
  total            NUMERIC(10,2) NOT NULL,
  shipping_method  VARCHAR(30),
  ship_name        VARCHAR(100),
  ship_address     VARCHAR(255),
  ship_city        VARCHAR(100),
  ship_zip         VARCHAR(20),
  card_last4       VARCHAR(4),
  created_at       TIMESTAMP DEFAULT NOW()
);

CREATE TABLE order_items (
  id         SERIAL PRIMARY KEY,
  order_id   INT NOT NULL REFERENCES orders(id)   ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity   INT NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL
);

-- ============================================================
-- SEED DATA
-- ============================================================

INSERT INTO categories (name, slug, emoji) VALUES
  ('Electronics', 'electronics', '🎧'),
  ('Fashion',     'fashion',     '🧥'),
  ('Home',        'home',        '🪴'),
  ('Kitchen',     'kitchen',     '🍳'),
  ('Books',       'books',       '📚'),
  ('Outdoors',    'outdoors',    '⛺'),
  ('Beauty',      'beauty',      '🧴'),
  ('Toys',        'toys',        '🧩');

INSERT INTO products (name, description, price, original_price, emoji, tint, badge, category_id, stock, avg_rating, review_count) VALUES
  ('Studio Over-Ear Headphones', 'Closed-back over-ear headphones with active noise cancelling, 40-hour battery and a fold-flat frame for travel.', 129.00, 169.00, '🎧', '#dfe7f1', 'SALE', 1, 42, 4.6, 318),
  ('Pocket Bluetooth Speaker',   'Palm-sized waterproof speaker (IP67) with surprisingly deep bass and 12 hours of playback.',                    39.00, NULL,   '🔊', '#e6e1f2', NULL,   1, 80, 4.3, 204),
  ('Linen Smartwatch Band',      'Breathable woven band that fits most 20mm smartwatches. Quick-release pins, no tools needed.',               19.00, NULL,   '⌚', '#efe6d8', 'NEW',   1, 120, 4.1, 57),
  ('Compact Mechanical Keyboard','75% layout, hot-swappable switches, warm-white backlight and a solid aluminium case.',                       119.00, NULL,   '⌨️', '#e2e6e3', 'TOP',  1, 25, 4.8, 441),
  ('Wool Overshirt',             'Heavyweight brushed-wool overshirt with two chest pockets. Layers over a tee or under a coat.',               89.00, 110.00, '🧥', '#efdcd2', 'SALE', 2, 30, 4.5, 133),
  ('Everyday Canvas Sneakers',   'Vulcanised rubber sole, organic cotton upper and a cushioned footbed for all-day wear.',                     64.00, NULL,   '👟', '#f1ecdc', NULL,   2, 60, 4.4, 276),
  ('Ribbed Beanie',              'Soft merino-blend beanie with a fold-over cuff. One size, five colours.',                                    22.00, NULL,   '🧢', '#e9dfe8', NULL,   2, 150, 4.2, 88),
  ('Polarised Sunglasses',       'Lightweight acetate frames with UV400 polarised lenses and a hard case.',                                     48.00, NULL,   '🕶️', '#e0e9e6', NULL,   2, 70, 4.0, 102),
  ('Ceramic Table Lamp',         'Hand-glazed ceramic base with a linen shade. Dimmable warm LED bulb included.',                               74.00, NULL,   '💡', '#f3e8d2', 'NEW',  3, 18, 4.7, 61),
  ('Trailing Pothos Plant',      'Easy-care trailing houseplant in a 12cm recycled pot. Thrives in low light.',                                 24.00, NULL,   '🪴', '#dcebdc', 'HOT',  3, 45, 4.6, 190),
  ('Soy Wax Candle — Cedar',     'Hand-poured soy candle with cedarwood and bergamot. 45-hour burn time.',                                      18.00, NULL,   '🕯️', '#efe3d3', NULL,   3, 200, 4.5, 154),
  ('Waffle Bath Towel Set',      'Set of two quick-dry cotton waffle towels. Gets softer with every wash.',                                     42.00, 52.00,  '🛁', '#e3ecef', 'SALE', 3, 55, 4.3, 79),
  ('Pour-Over Coffee Kit',       'Glass dripper, carafe and 100 paper filters — everything you need for a better cup.',                         36.00, NULL,   '☕', '#ece2d6', NULL,   4, 65, 4.6, 233),
  ('Cast Iron Skillet 26cm',     'Pre-seasoned cast iron skillet that goes from stovetop to oven to table.',                                     45.00, NULL,   '🍳', '#e4e2df', 'TOP',  4, 40, 4.8, 512),
  ('Bamboo Cutting Board',       'Thick end-grain bamboo board with a juice groove and side handles.',                                          28.00, NULL,   '🔪', '#efe7d1', NULL,   4, 90, 4.2, 66),
  ('The Quiet Craft (Hardcover)','A short, warm book about doing careful work in a noisy world. 240 pages.',                                    21.00, NULL,   '📕', '#f0dcd8', 'NEW',  5, 75, 4.7, 98),
  ('Field Notes Journal 3-Pack', 'Dot-grid pocket notebooks with recycled covers. 48 pages each.',                                              14.00, NULL,   '📓', '#e7e6d8', NULL,   5, 300, 4.4, 145),
  ('Ultralight Daypack 20L',     'Packable 20-litre daypack with a water-resistant shell and padded straps.',                                   58.00, 72.00,  '🎒', '#dfe8e3', 'SALE', 6, 35, 4.5, 167),
  ('Insulated Water Bottle',     'Double-wall stainless bottle, 750ml. Cold for 24 hours, hot for 12.',                                         29.00, NULL,   '🍶', '#dde6ef', 'HOT',  6, 110, 4.6, 389),
  ('Two-Person Camp Hammock',    'Parachute-nylon hammock with tree straps, packs down to the size of a grapefruit.',                           49.00, NULL,   '⛺', '#e6ecd9', NULL,   6, 28, 4.3, 74),
  ('Daily Mineral Sunscreen',    'Lightweight SPF 50 mineral sunscreen with no white cast. Reef-friendly.',                                     24.00, NULL,   '🧴', '#f3ead9', NULL,   7, 140, 4.2, 211),
  ('Botanical Lip Balm Trio',    'Three plant-based lip balms: unscented, mint and honey.',                                                     12.00, NULL,   '💄', '#f1dfe3', NULL,   7, 260, 4.0, 83),
  ('Wooden Puzzle Cube',         'Twelve interlocking beech-wood pieces. Harder than it looks, for ages 8+.',                                   16.00, NULL,   '🧩', '#efe4cf', NULL,   8, 95, 4.4, 58),
  ('Retro Pixel Building Set',   '480-piece building set that turns into a desk-sized retro arcade cabinet.',                                   54.00, NULL,   '🕹️', '#e2e0ef', 'NEW',  8, 22, 4.7, 121);

-- Test user — email: test@meridian.com  password: password123
INSERT INTO users (full_name, email, password_hash, city) VALUES
  ('Test User', 'test@meridian.com', '$2b$10$PErOdOzLtH.ReHVVWWCt0.qGA0Rd7OAgX27O/ZbGWIXwncbl5KuNK', 'San Francisco');

-- A few sample reviews from the test user
INSERT INTO reviews (product_id, user_id, rating, comment) VALUES
  (1,  1, 5, 'Noise cancelling is excellent on the bus. Comfortable for hours.'),
  (14, 1, 5, 'Heavy, heats evenly, and the seasoning held up from day one.'),
  (10, 1, 4, 'Arrived healthy and already has two new leaves.');
