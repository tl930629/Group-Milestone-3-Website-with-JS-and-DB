--
-- PostgreSQL database dump
--

\restrict eMfBg7zpiQrLcd2XvwrdMRf4MGVcCwjf5dSP7Sx9YMwp5qt7b40YMV7yLNSSV9C

-- Dumped from database version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart_items (
    id integer NOT NULL,
    user_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    added_at timestamp without time zone DEFAULT now(),
    CONSTRAINT cart_items_quantity_check CHECK ((quantity > 0))
);


--
-- Name: cart_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cart_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cart_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cart_items_id_seq OWNED BY public.cart_items.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    slug character varying(50) NOT NULL,
    emoji character varying(10) DEFAULT '🛍️'::character varying
);


--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id integer NOT NULL,
    order_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL
);


--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    user_id integer NOT NULL,
    status character varying(20) DEFAULT 'confirmed'::character varying,
    subtotal numeric(10,2) NOT NULL,
    shipping_cost numeric(10,2) DEFAULT 0 NOT NULL,
    discount numeric(10,2) DEFAULT 0 NOT NULL,
    tax numeric(10,2) NOT NULL,
    total numeric(10,2) NOT NULL,
    shipping_method character varying(30),
    ship_name character varying(100),
    ship_address character varying(255),
    ship_city character varying(100),
    ship_zip character varying(20),
    card_last4 character varying(4),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id integer NOT NULL,
    name character varying(150) NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    original_price numeric(10,2),
    emoji character varying(10) DEFAULT '📦'::character varying,
    tint character varying(10) DEFAULT '#efe9df'::character varying,
    badge character varying(20),
    category_id integer,
    stock integer DEFAULT 100,
    avg_rating numeric(3,2) DEFAULT 0,
    review_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT products_price_check CHECK ((price >= (0)::numeric)),
    CONSTRAINT products_stock_check CHECK ((stock >= 0))
);


--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id integer NOT NULL,
    product_id integer NOT NULL,
    user_id integer NOT NULL,
    rating integer NOT NULL,
    comment text,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reviews_id_seq OWNED BY public.reviews.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    full_name character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    phone character varying(30),
    address character varying(255),
    city character varying(100),
    zip character varying(20),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: wishlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wishlist (
    user_id integer NOT NULL,
    product_id integer NOT NULL,
    added_at timestamp without time zone DEFAULT now()
);


--
-- Name: cart_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items ALTER COLUMN id SET DEFAULT nextval('public.cart_items_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: reviews id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews ALTER COLUMN id SET DEFAULT nextval('public.reviews_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: cart_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cart_items (id, user_id, product_id, quantity, added_at) FROM stdin;
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.categories (id, name, slug, emoji) FROM stdin;
1	Electronics	electronics	🎧
2	Fashion	fashion	🧥
3	Home	home	🪴
4	Kitchen	kitchen	🍳
5	Books	books	📚
6	Outdoors	outdoors	⛺
7	Beauty	beauty	🧴
8	Toys	toys	🧩
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_items (id, order_id, product_id, quantity, unit_price) FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (id, user_id, status, subtotal, shipping_cost, discount, tax, total, shipping_method, ship_name, ship_address, ship_city, ship_zip, card_last4, created_at) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products (id, name, description, price, original_price, emoji, tint, badge, category_id, stock, avg_rating, review_count, created_at) FROM stdin;
1	Studio Over-Ear Headphones	Closed-back over-ear headphones with active noise cancelling, 40-hour battery and a fold-flat frame for travel.	129.00	169.00	🎧	#dfe7f1	SALE	1	42	4.60	318	2026-11-16 23:25:23.365686
2	Pocket Bluetooth Speaker	Palm-sized waterproof speaker (IP67) with surprisingly deep bass and 12 hours of playback.	39.00	\N	🔊	#e6e1f2	\N	1	80	4.30	204	2026-11-16 23:25:23.365686
3	Linen Smartwatch Band	Breathable woven band that fits most 20mm smartwatches. Quick-release pins, no tools needed.	19.00	\N	⌚	#efe6d8	NEW	1	120	4.10	57	2026-11-16 23:25:23.365686
4	Compact Mechanical Keyboard	75% layout, hot-swappable switches, warm-white backlight and a solid aluminium case.	119.00	\N	⌨️	#e2e6e3	TOP	1	25	4.80	441	2026-11-16 23:25:23.365686
5	Wool Overshirt	Heavyweight brushed-wool overshirt with two chest pockets. Layers over a tee or under a coat.	89.00	110.00	🧥	#efdcd2	SALE	2	30	4.50	133	2026-11-16 23:25:23.365686
6	Everyday Canvas Sneakers	Vulcanised rubber sole, organic cotton upper and a cushioned footbed for all-day wear.	64.00	\N	👟	#f1ecdc	\N	2	60	4.40	276	2026-11-16 23:25:23.365686
7	Ribbed Beanie	Soft merino-blend beanie with a fold-over cuff. One size, five colours.	22.00	\N	🧢	#e9dfe8	\N	2	150	4.20	88	2026-11-16 23:25:23.365686
8	Polarised Sunglasses	Lightweight acetate frames with UV400 polarised lenses and a hard case.	48.00	\N	🕶️	#e0e9e6	\N	2	70	4.00	102	2026-11-16 23:25:23.365686
9	Ceramic Table Lamp	Hand-glazed ceramic base with a linen shade. Dimmable warm LED bulb included.	74.00	\N	💡	#f3e8d2	NEW	3	18	4.70	61	2026-11-16 23:25:23.365686
10	Trailing Pothos Plant	Easy-care trailing houseplant in a 12cm recycled pot. Thrives in low light.	24.00	\N	🪴	#dcebdc	HOT	3	45	4.60	190	2026-11-16 23:25:23.365686
11	Soy Wax Candle — Cedar	Hand-poured soy candle with cedarwood and bergamot. 45-hour burn time.	18.00	\N	🕯️	#efe3d3	\N	3	200	4.50	154	2026-11-16 23:25:23.365686
12	Waffle Bath Towel Set	Set of two quick-dry cotton waffle towels. Gets softer with every wash.	42.00	52.00	🛁	#e3ecef	SALE	3	55	4.30	79	2026-11-16 23:25:23.365686
13	Pour-Over Coffee Kit	Glass dripper, carafe and 100 paper filters — everything you need for a better cup.	36.00	\N	☕	#ece2d6	\N	4	65	4.60	233	2026-11-16 23:25:23.365686
14	Cast Iron Skillet 26cm	Pre-seasoned cast iron skillet that goes from stovetop to oven to table.	45.00	\N	🍳	#e4e2df	TOP	4	40	4.80	512	2026-11-16 23:25:23.365686
15	Bamboo Cutting Board	Thick end-grain bamboo board with a juice groove and side handles.	28.00	\N	🔪	#efe7d1	\N	4	90	4.20	66	2026-11-16 23:25:23.365686
16	The Quiet Craft (Hardcover)	A short, warm book about doing careful work in a noisy world. 240 pages.	21.00	\N	📕	#f0dcd8	NEW	5	75	4.70	98	2026-11-16 23:25:23.365686
17	Field Notes Journal 3-Pack	Dot-grid pocket notebooks with recycled covers. 48 pages each.	14.00	\N	📓	#e7e6d8	\N	5	300	4.40	145	2026-11-16 23:25:23.365686
18	Ultralight Daypack 20L	Packable 20-litre daypack with a water-resistant shell and padded straps.	58.00	72.00	🎒	#dfe8e3	SALE	6	35	4.50	167	2026-11-16 23:25:23.365686
19	Insulated Water Bottle	Double-wall stainless bottle, 750ml. Cold for 24 hours, hot for 12.	29.00	\N	🍶	#dde6ef	HOT	6	110	4.60	389	2026-11-16 23:25:23.365686
20	Two-Person Camp Hammock	Parachute-nylon hammock with tree straps, packs down to the size of a grapefruit.	49.00	\N	⛺	#e6ecd9	\N	6	28	4.30	74	2026-11-16 23:25:23.365686
21	Daily Mineral Sunscreen	Lightweight SPF 50 mineral sunscreen with no white cast. Reef-friendly.	24.00	\N	🧴	#f3ead9	\N	7	140	4.20	211	2026-11-16 23:25:23.365686
22	Botanical Lip Balm Trio	Three plant-based lip balms: unscented, mint and honey.	12.00	\N	💄	#f1dfe3	\N	7	260	4.00	83	2026-11-16 23:25:23.365686
23	Wooden Puzzle Cube	Twelve interlocking beech-wood pieces. Harder than it looks, for ages 8+.	16.00	\N	🧩	#efe4cf	\N	8	95	4.40	58	2026-11-16 23:25:23.365686
24	Retro Pixel Building Set	480-piece building set that turns into a desk-sized retro arcade cabinet.	54.00	\N	🕹️	#e2e0ef	NEW	8	22	4.70	121	2026-11-16 23:25:23.365686
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reviews (id, product_id, user_id, rating, comment, created_at) FROM stdin;
1	1	1	5	Noise cancelling is excellent on the bus. Comfortable for hours.	2026-11-16 23:25:23.365686
2	14	1	5	Heavy, heats evenly, and the seasoning held up from day one.	2026-11-16 23:25:23.365686
3	10	1	4	Arrived healthy and already has two new leaves.	2026-11-16 23:25:23.365686
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sessions (sid, sess, expire) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, full_name, email, password_hash, phone, address, city, zip, created_at) FROM stdin;
1	Test User	test@meridian.com	$2b$10$PErOdOzLtH.ReHVVWWCt0.qGA0Rd7OAgX27O/ZbGWIXwncbl5KuNK	\N	\N	San Francisco	\N	2026-11-16 23:25:23.365686
\.


--
-- Data for Name: wishlist; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.wishlist (user_id, product_id, added_at) FROM stdin;
\.


--
-- Name: cart_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cart_items_id_seq', 1, false);


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.categories_id_seq', 8, true);


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.order_items_id_seq', 1, false);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.orders_id_seq', 1, false);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.products_id_seq', 24, true);


--
-- Name: reviews_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.reviews_id_seq', 3, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 1, true);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- Name: cart_items cart_items_user_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_user_id_product_id_key UNIQUE (user_id, product_id);


--
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_product_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_product_id_user_id_key UNIQUE (product_id, user_id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: wishlist wishlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist
    ADD CONSTRAINT wishlist_pkey PRIMARY KEY (user_id, product_id);


--
-- Name: idx_products_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_category ON public.products USING btree (category_id);


--
-- Name: idx_sessions_expire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_expire ON public.sessions USING btree (expire);


--
-- Name: cart_items cart_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: reviews reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: wishlist wishlist_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist
    ADD CONSTRAINT wishlist_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: wishlist wishlist_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlist
    ADD CONSTRAINT wishlist_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict eMfBg7zpiQrLcd2XvwrdMRf4MGVcCwjf5dSP7Sx9YMwp5qt7b40YMV7yLNSSV9C

