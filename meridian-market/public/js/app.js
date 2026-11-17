/* ==========================================================
   Meridian Market — shared front-end module
   - API helper (fetch + JSON + errors)
   - Auth state (GET /api/auth/me)
   - Cart: localStorage for guests, server cart when logged in,
           guest cart merged into the server cart on login
   - Header / footer / cart drawer injected on every page
   - Product card renderer, toasts, small helpers
   ========================================================== */
(function () {
  'use strict';

  // ---------- Preferences (applied before paint) ----------
  const prefs = JSON.parse(localStorage.getItem('meridian-prefs') || '{}');
  if (prefs.theme === 'dark' || (prefs.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.dataset.theme = 'dark';
  }
  if (prefs.text === 'large') document.documentElement.dataset.text = 'large';
  if (prefs.motion) document.write('<style id="motion-style">*{transition:none!important;animation:none!important}</style>');

  const FREE_SHIP = 50;
  const GUEST_KEY = 'meridian-cart';

  // ---------- Helpers ----------
  const $  = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => '$' + Number(n || 0).toFixed(2);
  const stars = r => {
    const full = Math.round(Number(r) || 0);
    return '<span class="stars" aria-label="' + (Number(r) || 0).toFixed(1) + ' out of 5">' + '★'.repeat(full) + '<span style="opacity:.3">' + '★'.repeat(5 - full) + '</span></span>';
  };
  const params = () => new URLSearchParams(location.search);
  const fmtDate = d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  async function api(path, opts = {}) {
    const res = await fetch(path, {
      method: opts.method || 'GET',
      headers: opts.body ? { 'Content-Type': 'application/json' } : {},
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      credentials: 'same-origin',
    });
    let data = {};
    try { data = await res.json(); } catch { /* empty body */ }
    if (!res.ok) {
      const err = new Error(data.error || 'Request failed (' + res.status + ')');
      err.status = res.status;
      throw err;
    }
    return data;
  }

  // ---------- Toasts ----------
  function toast(msg, type) {
    let stack = $('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      stack.setAttribute('role', 'status');
      stack.setAttribute('aria-live', 'polite');
      document.body.appendChild(stack);
    }
    const t = document.createElement('div');
    t.className = 'toast' + (type === 'error' ? ' error' : '');
    t.textContent = msg;
    stack.appendChild(t);
    setTimeout(() => t.remove(), 2800);
  }

  // ---------- Auth ----------
  const state = { user: null, cart: { items: [], count: 0, subtotal: 0 }, wishlist: new Set() };
  let readyResolve;
  const ready = new Promise(r => (readyResolve = r));

  async function loadAuth() {
    try {
      const me = await api('/api/auth/me');
      state.user = me.loggedIn ? me.user : null;
    } catch { state.user = null; }
  }

  async function logout() {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    location.href = '/';
  }

  // ---------- Cart ----------
  const guestCart = {
    read: () => JSON.parse(localStorage.getItem(GUEST_KEY) || '[]'),
    write: items => localStorage.setItem(GUEST_KEY, JSON.stringify(items)),
  };

  function guestSummary() {
    const items = guestCart.read().map((it, i) => ({ ...it, id: 'g' + it.product_id, _i: i }));
    return {
      items,
      count: items.reduce((s, i) => s + i.quantity, 0),
      subtotal: Math.round(items.reduce((s, i) => s + i.price * i.quantity, 0) * 100) / 100,
    };
  }

  async function refreshCart() {
    if (state.user) {
      try { state.cart = await api('/api/cart'); } catch { state.cart = { items: [], count: 0, subtotal: 0 }; }
    } else {
      state.cart = guestSummary();
    }
    renderCartUI();
    document.dispatchEvent(new CustomEvent('cart:change', { detail: state.cart }));
    return state.cart;
  }

  // product: {id, name, price, emoji, tint, stock}
  async function addToCart(product, quantity = 1) {
    quantity = Math.max(1, parseInt(quantity) || 1);
    try {
      if (state.user) {
        state.cart = await api('/api/cart', { method: 'POST', body: { product_id: product.id, quantity } });
      } else {
        const items = guestCart.read();
        const found = items.find(i => i.product_id === product.id);
        const max = product.stock || 99;
        if (found) found.quantity = Math.min(found.quantity + quantity, max);
        else items.unshift({ product_id: product.id, quantity: Math.min(quantity, max), name: product.name, price: Number(product.price), emoji: product.emoji, tint: product.tint, stock: product.stock });
        guestCart.write(items);
        state.cart = guestSummary();
      }
      renderCartUI();
      document.dispatchEvent(new CustomEvent('cart:change', { detail: state.cart }));
      toast('Added ' + product.name + ' to your cart');
    } catch (e) { toast(e.message, 'error'); }
  }

  async function setQty(itemId, quantity) {
    if (quantity < 1) return removeItem(itemId);
    if (state.user) {
      state.cart = await api('/api/cart/' + itemId, { method: 'PATCH', body: { quantity } });
    } else {
      const items = guestCart.read();
      const it = items.find(i => 'g' + i.product_id === itemId);
      if (it) it.quantity = Math.min(quantity, it.stock || 99);
      guestCart.write(items);
      state.cart = guestSummary();
    }
    renderCartUI();
    document.dispatchEvent(new CustomEvent('cart:change', { detail: state.cart }));
  }

  async function removeItem(itemId) {
    if (state.user) {
      state.cart = await api('/api/cart/' + itemId, { method: 'DELETE' });
    } else {
      guestCart.write(guestCart.read().filter(i => 'g' + i.product_id !== itemId));
      state.cart = guestSummary();
    }
    renderCartUI();
    document.dispatchEvent(new CustomEvent('cart:change', { detail: state.cart }));
  }

  // Called right after a successful login/register
  async function mergeGuestCart() {
    const items = guestCart.read();
    if (!items.length) return;
    try {
      await api('/api/cart/merge', { method: 'POST', body: { items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity })) } });
      localStorage.removeItem(GUEST_KEY);
    } catch { /* keep guest cart if merge fails */ }
  }

  // ---------- Wishlist ----------
  async function loadWishlist() {
    if (!state.user) return;
    try { state.wishlist = new Set((await api('/api/wishlist')).ids); } catch { /* ignore */ }
  }
  async function toggleWish(productId, btn) {
    if (!state.user) {
      toast('Log in to save items to your wishlist');
      return;
    }
    try {
      const r = await api('/api/wishlist/' + productId, { method: 'POST' });
      r.saved ? state.wishlist.add(productId) : state.wishlist.delete(productId);
      $$('.wish-btn[data-id="' + productId + '"]').forEach(b => {
        b.classList.toggle('saved', r.saved);
        b.setAttribute('aria-pressed', r.saved);
      });
      toast(r.saved ? 'Saved to your wishlist' : 'Removed from your wishlist');
    } catch (e) { toast(e.message, 'error'); }
  }

  // ---------- Product card ----------
  const ICON_HEART = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3.3 5 6.8 5c2 0 3.5 1.1 5.2 3 1.7-1.9 3.2-3 5.2-3 3.5 0 5.6 3.6 4.3 6.8C19.5 16.4 12 21 12 21z"/></svg>';
  const ICON_PLUS = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';

  function priceHtml(p) {
    if (p.original_price && p.original_price > p.price) {
      return '<span class="price on-sale"><ins>' + money(p.price) + '</ins><del>' + money(p.original_price) + '</del></span>';
    }
    return '<span class="price">' + money(p.price) + '</span>';
  }

  function badgeHtml(p) {
    if (!p.badge) return '';
    const cls = p.badge === 'SALE' ? 'sale' : p.badge === 'NEW' ? 'new' : '';
    const label = { SALE: 'Sale', NEW: 'New', HOT: 'Popular', TOP: 'Top rated' }[p.badge] || p.badge;
    return '<span class="badge ' + cls + '">' + esc(label) + '</span>';
  }

  function productCard(p) {
    const saved = state.wishlist.has(p.id);
    return '<article class="product-card">' +
      '<div class="product-tile" style="--tint:' + esc(p.tint) + '">' + badgeHtml(p) + '<span aria-hidden="true">' + esc(p.emoji) + '</span></div>' +
      '<button class="wish-btn' + (saved ? ' saved' : '') + '" data-id="' + p.id + '" aria-pressed="' + saved + '" aria-label="Save ' + esc(p.name) + ' to wishlist">' + ICON_HEART + '</button>' +
      '<div class="product-info">' +
        '<span class="product-cat">' + esc(p.category || '') + '</span>' +
        '<h3 class="product-name h4"><a href="/products/detail.html?id=' + p.id + '">' + esc(p.name) + '</a></h3>' +
        '<div class="product-meta">' + stars(p.avg_rating) + '<span>(' + (p.review_count || 0) + ')</span></div>' +
        '<div class="product-bottom">' + priceHtml(p) +
          '<button class="add-btn" data-add="' + p.id + '" aria-label="Add ' + esc(p.name) + ' to cart"' + (p.stock === 0 ? ' disabled' : '') + '>' + ICON_PLUS + '</button>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function skeletonCards(n = 8) {
    return Array.from({ length: n }, () => '<div class="product-card skeleton"><div class="product-tile"></div><div class="skeleton-line" style="width:70%"></div><div class="skeleton-line" style="width:40%"></div></div>').join('');
  }

  // Renders cards into a container and wires up add / wishlist buttons
  function renderProducts(container, products, emptyHtml) {
    if (!products.length) {
      container.innerHTML = emptyHtml || '<div class="empty" style="grid-column:1/-1"><div class="big">🔎</div><h3>No products match</h3><p>Try removing a filter or searching for something broader.</p></div>';
      return;
    }
    container.innerHTML = products.map(productCard).join('');
    const byId = Object.fromEntries(products.map(p => [p.id, p]));
    container.onclick = e => {
      const add = e.target.closest('[data-add]');
      if (add) { e.preventDefault(); addToCart(byId[add.dataset.add]); return; }
      const wish = e.target.closest('.wish-btn');
      if (wish) { e.preventDefault(); toggleWish(Number(wish.dataset.id), wish); }
    };
  }

  // ---------- Header / footer / drawer ----------
  const ICON_SEARCH = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
  const ICON_BAG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>';
  const ICON_MENU = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';

  function headerHtml() {
    const path = location.pathname;
    const is = p => (p === '/' ? path === '/' || path === '/index.html' : path.startsWith(p)) ? ' class="active" aria-current="page"' : '';
    return '<a class="sr-only" href="#main">Skip to content</a>' +
      '<div class="notice-bar">Free standard shipping on orders over $' + FREE_SHIP + '. New here? Use <strong>WELCOME15</strong> at checkout.</div>' +
      '<div class="wrap header-row">' +
        '<button class="icon-btn menu-toggle" aria-label="Open menu" aria-expanded="false" id="menu-toggle">' + ICON_MENU + '</button>' +
        '<a href="/" class="logo" aria-label="Meridian Market home"><span class="logo-mark" aria-hidden="true"></span>meridian</a>' +
        '<form class="header-search" role="search" action="/search/">' +
          ICON_SEARCH + '<label class="sr-only" for="q-header">Search products</label>' +
          '<input id="q-header" name="q" type="search" placeholder="Search 24 products" autocomplete="off">' +
        '</form>' +
        '<nav class="main-nav" id="main-nav" aria-label="Main">' +
          '<a href="/"' + is('/') + '>Home</a>' +
          '<a href="/products/"' + is('/products') + '>Shop</a>' +
          '<a href="/about/"' + is('/about') + '>About</a>' +
          '<a href="/faq/"' + is('/faq') + '>Help</a>' +
          '<div class="more-wrap"><button class="more-btn" id="more-btn" aria-expanded="false" aria-controls="more-menu">More</button>' +
            '<div class="more-menu" id="more-menu">' +
              '<a href="/search/">Search</a><a href="/settings/">Settings</a><a href="/security/">Security</a>' +
              '<a href="/navigation/">Navigation components</a><a href="/ads/">Ad formats</a>' +
            '</div></div>' +
        '</nav>' +
        '<div class="header-actions">' +
          (state.user
            ? '<a href="/account/" class="icon-btn" title="Your account">Hi, ' + esc(state.user.full_name.split(' ')[0]) + '</a><button class="icon-btn" id="logout-btn">Log out</button>'
            : '<a href="/auth/" class="icon-btn">Log in</a>') +
          '<button class="icon-btn cart-btn" id="cart-open" aria-label="Open cart">' + ICON_BAG + '<span class="cart-count">0</span></button>' +
        '</div>' +
      '</div>';
  }

  function footerHtml() {
    return '<div class="wrap"><div class="footer-grid">' +
      '<div><a href="/" class="logo"><span class="logo-mark" aria-hidden="true"></span>meridian</a><p>Everyday goods, chosen with care and shipped from San Francisco. A CSC 317 group project.</p></div>' +
      '<div><h4>Shop</h4><ul><li><a href="/products/">All products</a></li><li><a href="/products/?sale=1">Deals</a></li><li><a href="/products/?sort=newest">New arrivals</a></li><li><a href="/search/">Search</a></li></ul></div>' +
      '<div><h4>Help</h4><ul><li><a href="/faq/">FAQ</a></li><li><a href="/faq/#shipping">Shipping & returns</a></li><li><a href="/security/">Security</a></li><li><a href="/account/">Your orders</a></li></ul></div>' +
      '<div><h4>Company</h4><ul><li><a href="/about/">About us</a></li><li><a href="/settings/">Settings</a></li><li><a href="/navigation/">Navigation demo</a></li><li><a href="/ads/">Ad formats</a></li></ul></div>' +
      '</div><div class="footer-bottom"><span>© 2026 Meridian Market. Student project, not a real store.</span><span>Prices in USD</span></div></div>';
  }

  function drawerHtml() {
    return '<div class="drawer-overlay" id="drawer-overlay"></div>' +
      '<aside class="drawer" id="cart-drawer" aria-label="Shopping cart" aria-hidden="true">' +
        '<div class="drawer-head"><h3>Your cart</h3><button class="icon-btn" id="cart-close" aria-label="Close cart">✕</button></div>' +
        '<div class="drawer-body" id="drawer-body"></div>' +
        '<div class="drawer-foot" id="drawer-foot"></div>' +
      '</aside>';
  }

  function lineItemHtml(it) {
    return '<div class="line-item" data-item="' + it.id + '">' +
      '<div class="thumb" style="--tint:' + esc(it.tint) + '" aria-hidden="true">' + esc(it.emoji) + '</div>' +
      '<div><div class="name">' + esc(it.name) + '</div><div class="muted small">' + money(it.price) + ' each</div>' +
        '<div class="flex" style="gap:0"><div class="qty"><button data-dec aria-label="Decrease quantity">−</button><span>' + it.quantity + '</span><button data-inc aria-label="Increase quantity">+</button></div>' +
        '<button class="remove-btn" data-remove>Remove</button></div></div>' +
      '<strong>' + money(it.price * it.quantity) + '</strong>' +
    '</div>';
  }

  function bindLineItems(root) {
    root.onclick = async e => {
      const row = e.target.closest('[data-item]');
      if (!row) return;
      const id = row.dataset.item;
      const it = state.cart.items.find(i => String(i.id) === id);
      if (!it) return;
      try {
        if (e.target.closest('[data-inc]')) await setQty(id, it.quantity + 1);
        else if (e.target.closest('[data-dec]')) await setQty(id, it.quantity - 1);
        else if (e.target.closest('[data-remove]')) await removeItem(id);
      } catch (err) { toast(err.message, 'error'); }
    };
  }

  function renderCartUI() {
    $$('.cart-count').forEach(el => (el.textContent = state.cart.count));
    const body = $('#drawer-body'), foot = $('#drawer-foot');
    if (!body) return;
    if (!state.cart.items.length) {
      body.innerHTML = '<div class="empty"><div class="big">🛍️</div><h3>Your cart is empty</h3><p>Browse the shop and tap + on anything you like.</p><a href="/products/" class="btn btn-primary">Start shopping</a></div>';
      foot.innerHTML = '';
      return;
    }
    body.innerHTML = state.cart.items.map(lineItemHtml).join('');
    bindLineItems(body);
    const left = Math.max(0, FREE_SHIP - state.cart.subtotal);
    foot.innerHTML =
      '<p class="small">' + (left > 0 ? 'Add <strong>' + money(left) + '</strong> more for free standard shipping.' : 'You get free standard shipping.') + '</p>' +
      '<div class="ship-meter"><span style="width:' + Math.min(100, (state.cart.subtotal / FREE_SHIP) * 100) + '%"></span></div>' +
      '<div class="row"><span>Subtotal (' + state.cart.count + ' items)</span><strong>' + money(state.cart.subtotal) + '</strong></div>' +
      '<p class="muted small" style="margin-bottom:1rem">Tax and shipping are calculated at checkout.</p>' +
      '<a href="/checkout/" class="btn btn-primary btn-block">Go to checkout</a>';
  }

  function openCart() {
    $('#cart-drawer').classList.add('open');
    $('#cart-drawer').setAttribute('aria-hidden', 'false');
    $('#drawer-overlay').classList.add('open');
    $('#cart-close').focus();
  }
  function closeCart() {
    $('#cart-drawer').classList.remove('open');
    $('#cart-drawer').setAttribute('aria-hidden', 'true');
    $('#drawer-overlay').classList.remove('open');
  }

  function mountChrome() {
    let header = $('#site-header');
    if (!header) { header = document.createElement('header'); header.id = 'site-header'; document.body.prepend(header); }
    header.className = 'site-header';
    header.innerHTML = headerHtml();

    let footer = $('#site-footer');
    if (!footer) { footer = document.createElement('footer'); footer.id = 'site-footer'; document.body.appendChild(footer); }
    footer.className = 'site-footer';
    footer.innerHTML = footerHtml();

    document.body.insertAdjacentHTML('beforeend', drawerHtml());

    $('#cart-open').onclick = openCart;
    $('#cart-close').onclick = closeCart;
    $('#drawer-overlay').onclick = closeCart;
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeCart(); $('#more-menu')?.classList.remove('open'); } });

    const moreBtn = $('#more-btn'), moreMenu = $('#more-menu');
    moreBtn.onclick = e => { e.stopPropagation(); const o = moreMenu.classList.toggle('open'); moreBtn.setAttribute('aria-expanded', o); };
    document.addEventListener('click', e => { if (!e.target.closest('.more-wrap')) moreMenu.classList.remove('open'); });

    const toggle = $('#menu-toggle');
    toggle.onclick = () => { const o = $('#main-nav').classList.toggle('open'); toggle.setAttribute('aria-expanded', o); };

    const lo = $('#logout-btn');
    if (lo) lo.onclick = logout;

    const q = params().get('q');
    if (q && $('#q-header')) $('#q-header').value = q;
  }

  // ---------- Boot ----------
  async function boot() {
    await loadAuth();
    mountChrome();
    await Promise.all([refreshCart(), loadWishlist()]);
    readyResolve(state);
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();

  // ---------- Public API ----------
  window.M = {
    $, $$, esc, money, stars, params, fmtDate, api, toast,
    state, ready, refreshCart, addToCart, setQty, removeItem, mergeGuestCart,
    toggleWish, productCard, renderProducts, skeletonCards, lineItemHtml, bindLineItems,
    priceHtml, badgeHtml, openCart, prefs, FREE_SHIP,
  };
})();
