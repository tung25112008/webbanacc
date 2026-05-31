const express = require('express');
const { authenticateToken } = require('../middleware/auth');

module.exports = function(db) {
  const router = express.Router();

  // GET /api/cart - Get user's cart
  router.get('/', authenticateToken, (req, res) => {
    const items = db.prepare(`
      SELECT ci.id, ci.added_at, a.*
      FROM cart_items ci
      JOIN accounts a ON ci.account_id = a.id
      WHERE ci.user_id = ? AND a.status = 'available'
      ORDER BY ci.added_at DESC
    `).all(req.user.id);

    const total = items.reduce((sum, item) => sum + item.price, 0);

    res.json({ items, total, count: items.length });
  });

  // POST /api/cart - Add to cart
  router.post('/', authenticateToken, (req, res) => {
    const { account_id } = req.body;

    if (!account_id) {
      return res.status(400).json({ error: 'Thiếu account_id' });
    }

    // Check account exists and is available
    const account = db.prepare("SELECT * FROM accounts WHERE id = ? AND status = 'available'").get(account_id);
    if (!account) {
      return res.status(404).json({ error: 'Tài khoản không tồn tại hoặc đã bán' });
    }

    // Check not already in cart
    const existing = db.prepare('SELECT id FROM cart_items WHERE user_id = ? AND account_id = ?').get(req.user.id, account_id);
    if (existing) {
      return res.status(400).json({ error: 'Tài khoản đã có trong giỏ hàng' });
    }

    db.prepare('INSERT INTO cart_items (user_id, account_id) VALUES (?, ?)').run(req.user.id, account_id);

    // Return updated cart count
    const count = db.prepare('SELECT COUNT(*) as count FROM cart_items WHERE user_id = ?').get(req.user.id).count;

    res.json({ message: 'Đã thêm vào giỏ hàng!', cartCount: count });
  });

  // DELETE /api/cart/:id - Remove from cart
  router.delete('/:id', authenticateToken, (req, res) => {
    // req.params.id is the account_id from the frontend
    db.prepare('DELETE FROM cart_items WHERE account_id = ? AND user_id = ?').run(req.params.id, req.user.id);

    const count = db.prepare('SELECT COUNT(*) as count FROM cart_items WHERE user_id = ?').get(req.user.id).count;

    res.json({ message: 'Đã xóa khỏi giỏ hàng', cartCount: count });
  });

  // GET /api/cart/count - Get cart count
  router.get('/count', authenticateToken, (req, res) => {
    const count = db.prepare('SELECT COUNT(*) as count FROM cart_items WHERE user_id = ?').get(req.user.id).count;
    res.json({ count });
  });

  return router;
};
