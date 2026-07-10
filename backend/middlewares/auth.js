const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'titkos_drivecheck_kulcs_2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) return res.status(401).json({ hiba: 'Hiányzó token!' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ hiba: 'Érvénytelen token!' });
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ hiba: '403 Forbidden!' });
  next();
}

module.exports = { authenticateToken, requireAdmin, JWT_SECRET };