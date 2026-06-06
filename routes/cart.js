const express = require('express');
const { authenticateToken } = require('../middleware/auth');

module.exports = function(db) {
  const router = express.Router();

  // GET /api/cart - Get user's cart
  router.get('/', authenticateToken, (req, res) => {
    const items = db.prepare(`
      SELECT ci.id, ci.added_at, ci.quantity as cart_quantity, a.*
      FROM cart_items ci
      JOIN accounts a ON ci.account_id = a.id
      WHERE ci.user_id = ? AND a.status = 'available' AND a.stock > 0
      ORDER BY ci.added_at DESC
    `).all(req.user.id);

    // If a bulk item was added with quantity > stock, cap it visually or we can enforce it on checkout
    items.forEach(item => {
      if (item.type === 'bulk' && item.cart_quantity > item.stock) {
        item.cart_quantity = item.stock;
      }
    });

    const total = items.reduce((sum, item) => sum + (item.price * (item.cart_quantity || 1)), 0);

    res.json({ items, total, count: items.length });
  });

  // POST /api/cart - Add to cart
  router.post('/', authenticateToken, (req, res) => {
    const { account_id, quantity } = req.body;
    const reqQty = parseInt(quantity) || 1;

    if (!account_id) {
      return res.status(400).json({ error: 'Thiếu account_id' });
    }

    // Check account exists and is available
    const account = db.prepare("SELECT * FROM accounts WHERE id = ? AND status = 'available'").get(account_id);
    if (!account || account.stock < 1) {
      return res.status(404).json({ error: 'Tài khoản không tồn tại hoặc đã hết hàng' });
    }

    if (account.type === 'bulk' && reqQty > account.stock) {
      return res.status(400).json({ error: \`Số lượng yêu cầu vượt quá tồn kho (\${account.stock})\` });
    }
    
    // Check not already in cart
    const existing = db.prepare('SELECT id, quantity FROM cart_items WHERE user_id = ? AND account_id = ?').get(req.user.id, account_id);
    if (existing) {
      if (account.type === 'bulk') {
        const newQty = existing.quantity + reqQty;
        if (newQty > account.stock) {
          return res.status(400).json({ error: \`Tổng số lượng trong giỏ vượt quá tồn kho (\${account.stock})\` });
        }
        db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(newQty, existing.id);
      } else {
        return res.status(400).json({ error: 'Tài khoản đã có trong giỏ hàng' });
      }
    } else {
      db.prepare('INSERT INTO cart_items (user_id, account_id, quantity) VALUES (?, ?, ?)').run(req.user.id, account_id, account.type === 'bulk' ? reqQty : 1);
    }

    // Return updated cart count
    const count = db.prepare('SELECT COUNT(*) as count FROM cart_items WHERE user_id = ?').get(req.user.id).count;

    res.json({ message: 'Đã thêm vào giỏ hàng!', cartCount: count });
  });

  // PUT /api/cart/:id - Update cart item quantity
  router.put('/:id', authenticateToken, (req, res) => {
    const { quantity } = req.body;
    const reqQty = parseInt(quantity) || 1;

    const account = db.prepare("SELECT * FROM accounts WHERE id = ? AND status = 'available'").get(req.params.id);
    if (!account || account.stock < 1) {
      return res.status(404).json({ error: 'Tài khoản đã hết hàng' });
    }

    if (account.type === 'bulk' && reqQty > account.stock) {
      return res.status(400).json({ error: \`Số lượng yêu cầu vượt quá tồn kho (\${account.stock})\` });
    }

    db.prepare('UPDATE cart_items SET quantity = ? WHERE account_id = ? AND user_id = ?').run(account.type === 'bulk' ? reqQty : 1, req.params.id, req.user.id);
    res.json({ message: 'Đã cập nhật số lượng' });
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
