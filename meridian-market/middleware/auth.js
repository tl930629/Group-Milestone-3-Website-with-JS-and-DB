// middleware/auth.js — session guards

function isApi(req) {
  return req.originalUrl.startsWith('/api/');
}

// Only let logged-in users through.
function requireLogin(req, res, next) {
  if (req.session && req.session.userId) return next();
  if (isApi(req)) return res.status(401).json({ error: 'Please log in first.' });
  return res.redirect('/auth/?redirect=' + encodeURIComponent(req.originalUrl));
}

// Block login/register when already logged in.
function requireGuest(req, res, next) {
  if (req.session && req.session.userId) {
    if (isApi(req)) return res.status(400).json({ error: 'You are already logged in.' });
    return res.redirect('/account/');
  }
  next();
}

module.exports = { requireLogin, requireGuest };
