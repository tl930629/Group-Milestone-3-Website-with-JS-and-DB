# CSC 317 — Group Project: Meridian Market

**Team:** [Your Team Name]

**Members:** tl930629

Meridian Market is a full-stack e-commerce site built with **Node.js + Express + PostgreSQL**.
Shoppers can browse 24 products in 8 categories, filter and search, keep a cart (as a guest or
logged in), check out, leave reviews, save a wishlist, and manage their account.

---

## Quick start

**Requirements:** Node.js 18+ and PostgreSQL 13+.

```bash
# 1. Install dependencies
npm install

# 2. Create the database (once)
createdb meridian            # or in psql:  CREATE DATABASE meridian;

# 3. Configure the connection
cp .env.example .env         # then edit DB_USER / DB_PASS / SESSION_SECRET

# 4. Create tables + seed products and a test user
npm run db:init

# 5. Start the server
npm start                    # → http://localhost:3000
```

**Test account:** `test@meridian.com` / `password123`
**Promo codes:** `WELCOME15` (15% off), `MERIDIAN10` (10% off)
**Test card:** `4242 4242 4242 4242`, any future expiry, any 3-digit code

> `npm run db:init` drops and recreates every table, so it also works as a "reset database" command.

### Database export / import

The repository includes two exports of the seeded database: `backup.tar` (pg_dump tar format) and
`backup.sql` (plain SQL). Either one can be used instead of `npm run db:init`.

```bash
# Export (dump)
pg_dump -U $DB_USER -W -F t $DB_NAME > backup.tar
pg_dump -U $DB_USER -W -F p $DB_NAME > backup.sql

# Import (restore) into an empty database
createdb -U $DB_USER meridian
pg_restore -U $DB_USER -W -d meridian backup.tar
# or, from the plain SQL file:
psql -U $DB_USER -d meridian -f backup.sql
```

If `pg_restore` gives a permissions error on Linux, try:
`sudo -u postgres pg_restore -h /var/run/postgresql -d meridian < backup.tar`

---

## Pages

| # | Page | URL | What it does |
|---|------|-----|--------------|
| P1 | Storefront | `/` | Store-directory hero with live category counts, most-reviewed products, deals band, newsletter |
| P2 | Shop | `/products/` | Category / price / rating / on-sale filters, 6 sort orders, pagination, filters kept in the URL |
| P2b | Product detail | `/products/detail.html?id=N` | Quantity picker, stock level, wishlist, reviews (post / update), related products |
| P3 | Checkout | `/checkout/` | 5 steps: Cart → Shipping → Payment → Review → Confirmed. Field validation, Luhn card check, promo codes, live totals |
| P4 | Log in / Register | `/auth/` | Tabs, inline validation, password strength meter, show/hide password, "keep me logged in" |
| P5 | About | `/about/` | Principles, project timeline, team |
| P6 | Help centre (FAQ) | `/faq/` | Searchable accordion grouped by topic |
| P7 | Settings | `/settings/` | Light / dark / system theme, larger text, reduced motion, notification and privacy toggles |
| P8 | Search | `/search/?q=` | Live search against the database, suggested terms, match highlighting, sort |
| P9 | Navigation | `/navigation/` | Breadcrumb, data-driven sidebar, mega menu, keyboard-accessible tabs, dropdown, pagination, mobile bar |
| P10 | Ads | `/ads/` | Leaderboard, in-feed sponsored card, sidebar ad, accessible pop-up offer |
| P11 | Security | `/security/` | How passwords, sessions and card data are handled; issue-report form |
| — | Account | `/account/` | **Login required.** Order history with expandable details, wishlist, profile, change password |
| — | 404 | any unknown URL | Custom not-found page with search |

---

## Project structure

```
backup.tar / backup.sql  PostgreSQL database export (restorable)
.env.example           Template for DB credentials (copy to .env)
server.js              Express app: sessions, API routes, protected pages, static files, 404
db/
  schema.sql           Tables + seed data (8 categories, 24 products, test user, reviews)
  init.js              `npm run db:init` — runs schema.sql using .env settings
  pool.js              Shared pg connection pool
middleware/auth.js     requireLogin / requireGuest
routes/
  auth.js              register, login, logout, me
  categories.js        category list with product counts
  products.js          list / featured / deals / search / detail / reviews
  cart.js              server cart + guest-cart merge
  orders.js            quote, place order (transaction), history, detail
  users.js             profile, change password
  wishlist.js          list, toggle
public/
  css/style.css        Design system (CSS variables, light + dark theme)
  js/app.js            Shared module: API helper, auth state, cart, header/footer, cart drawer, product cards, toasts
  …/index.html         One folder per page
```

---

## API reference

All endpoints return JSON. 🔒 = requires a logged-in session (returns `401` otherwise).

### Auth
| Method | Route | Body | Description |
|---|---|---|---|
| POST | `/api/auth/register` | `full_name, email, password` | Create account and log in |
| POST | `/api/auth/login` | `email, password, remember?` | Log in |
| POST | `/api/auth/logout` | — | Destroy session |
| GET | `/api/auth/me` | — | `{ loggedIn, user }` |

### Catalogue
| Method | Route | Description |
|---|---|---|
| GET | `/api/categories` | Categories with product counts |
| GET | `/api/products` | Query: `category` (comma-separated slugs), `minPrice`, `maxPrice`, `minRating`, `sale=1`, `sort` (`featured`, `rating`, `price-asc`, `price-desc`, `newest`, `name`), `page`, `limit` |
| GET | `/api/products/featured` | 8 most-reviewed products |
| GET | `/api/products/deals` | Products on sale |
| GET | `/api/products/search?q=&sort=` | Search name, description and category |
| GET | `/api/products/:id` | Product + reviews + related products |
| POST 🔒 | `/api/products/:id/reviews` | `rating (1–5), comment` — add or update your review; updates the product's average |

### Cart 🔒
| Method | Route | Description |
|---|---|---|
| GET | `/api/cart` | Items, count, subtotal |
| POST | `/api/cart` | `product_id, quantity` — add (capped at stock) |
| POST | `/api/cart/merge` | `items: [{product_id, quantity}]` — move guest cart in after login |
| PATCH | `/api/cart/:id` | `quantity` |
| DELETE | `/api/cart/:id` | Remove one item |
| DELETE | `/api/cart` | Empty cart |

### Orders 🔒
| Method | Route | Description |
|---|---|---|
| POST | `/api/orders/quote` | `shipping_method, promo` — price preview |
| POST | `/api/orders` | `ship_name, ship_address, ship_city, ship_zip, card_number, shipping_method, promo` — places the order in one transaction (stock check, stock decrement, cart cleared) |
| GET | `/api/orders` | Order history |
| GET | `/api/orders/:id` | Order detail with items |

### Users & wishlist 🔒
| Method | Route | Description |
|---|---|---|
| GET | `/api/users/profile` | Profile + order stats |
| PATCH | `/api/users/profile` | `full_name, phone, address, city, zip` |
| POST | `/api/users/change-password` | `current_password, new_password` |
| GET | `/api/wishlist` | Saved products |
| POST | `/api/wishlist/:productId` | Toggle saved / not saved |

---

## Database

`users`, `categories`, `products`, `reviews`, `cart_items`, `wishlist`, `orders`, `order_items`, `sessions`.
Foreign keys cascade on delete; `cart_items (user_id, product_id)` and `reviews (product_id, user_id)` are unique so
adding the same item twice increases its quantity and posting a second review updates the first.

---

## How it works

- **Guest + account cart.** Guests' carts live in `localStorage`. On login or sign-up, `POST /api/cart/merge` moves
  those items into the database cart, so nothing is lost.
- **Server is the source of truth for money.** The checkout page shows live totals, but `POST /api/orders` recalculates
  shipping, discount, tax (8.625%) and total from database prices, checks stock with row locks, and runs inside a
  transaction.
- **Security.** bcrypt password hashing (10 rounds), session ID regenerated on login, `httpOnly` + `sameSite=lax`
  cookies stored in PostgreSQL, parameterised SQL everywhere, HTML escaping on all rendered user content, only the last
  4 card digits stored, and `/account/` redirects to log in on the server side.
- **Accessibility.** Skip link, visible focus rings, labelled form fields with inline errors, ARIA tabs / menus / dialog,
  keyboard support (Escape closes drawers and menus, arrow keys move between tabs), `prefers-reduced-motion` respected.
- **Design.** Cool grey paper, navy ink, cobalt for actions and marigold reserved for deals. Bricolage Grotesque for
  headings, Instrument Sans for text. Full dark theme driven by CSS variables.

---

## Known limitations

- Product images are emoji on tinted tiles (no photo assets).
- Payments are simulated; no payment provider is called.
- Newsletter sign-up and the security report form show confirmation only; they don't send email.
- Settings preferences are stored per browser, not per account.

---

## Use of GenAI

[Describe how your team used AI tools, e.g. "Claude was used to help generate and review code structure. All team
members reviewed and understand the code."]

---

## Git tags

| Tag | Milestone |
|-----|-----------|
| `HTMLCSS` | Milestone 2 — front-end |
| `JSDB` | Milestone 3 — back-end + database |
| `FINAL` | Milestone 4 — final |

```bash
git tag -a FINAL -m "Final version"
git push origin --tags
```
