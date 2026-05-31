const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'tft-shop-secret-key-2024';

// Verify JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Vui lòng đăng nhập để tiếp tục' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
  }
}

// Check admin role
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Bạn không có quyền truy cập' });
  }
  next();
}

// Optional auth - attach user if token exists, but don't block
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      // Token invalid, continue without user
    }
  }
  next();
}

module.exports = { authenticateToken, requireAdmin, optionalAuth, JWT_SECRET };
