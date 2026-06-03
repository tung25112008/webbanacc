const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

module.exports = function(db) {
  const router = express.Router();

  // POST /api/orders - Create order from cart
  router.post('/', authenticateToken, (req, res) => {
    const { payment_method, account_ids } = req.body;

    if (!account_ids || account_ids.length === 0) {
      return res.status(400).json({ error: 'Không có tài khoản nào để đặt hàng' });
    }

    const method = payment_method || 'banking';

    const createOrders = db.transaction(() => {
      const orders = [];

      for (const accountId of account_ids) {
        // Check account is available
        const account = db.prepare("SELECT * FROM accounts WHERE id = ? AND status = 'available'").get(accountId);
        if (!account) continue;

        // Generate order code
        const orderCode = 'TFT' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();

        // Create order
        const result = db.prepare(`
          INSERT INTO orders (order_code, user_id, account_id, total_price, payment_method, status)
          VALUES (?, ?, ?, ?, ?, 'pending')
        `).run(orderCode, req.user.id, accountId, account.price, method);

        // Mark account as reserved
        db.prepare("UPDATE accounts SET status = 'reserved' WHERE id = ?").run(accountId);

        // Remove from cart
        db.prepare('DELETE FROM cart_items WHERE user_id = ? AND account_id = ?').run(req.user.id, accountId);

        orders.push({
          id: Number(result.lastInsertRowid),
          order_code: orderCode,
          account_title: account.title,
          total_price: account.price,
          payment_method: method
        });
      }

      return orders;
    });

    const orders = createOrders();

    if (orders.length === 0) {
      return res.status(400).json({ error: 'Không có tài khoản nào khả dụng' });
    }

    const totalAmount = orders.reduce((sum, o) => sum + o.total_price, 0);

    res.json({
      message: 'Đặt hàng thành công!',
      orders,
      totalAmount,
      payment: getPaymentInfo(method, totalAmount, orders[0].order_code)
    });
  });

  // GET /api/orders - Get user's orders
  router.get('/', authenticateToken, (req, res) => {
    const orders = db.prepare(`
      SELECT o.*,
        a.title as account_title, a.rank_tier, a.price as account_price,
        CASE WHEN o.status = 'completed' THEN a.acc_username ELSE NULL END as acc_username,
        CASE WHEN o.status = 'completed' THEN a.acc_password ELSE NULL END as acc_password,
        CASE WHEN o.status = 'completed' THEN a.acc_email ELSE NULL END as acc_email
      FROM orders o
      JOIN accounts a ON o.account_id = a.id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
    `).all(req.user.id);

    res.json({ orders });
  });

  // GET /api/orders/all - Get all orders (admin)
  router.get('/all', authenticateToken, requireAdmin, (req, res) => {
    const orders = db.prepare(`
      SELECT o.*, a.title as account_title, a.rank_tier, u.username
      FROM orders o
      JOIN accounts a ON o.account_id = a.id
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `).all();

    res.json({ orders });
  });

  // GET /api/orders/admin/stats - Admin stats
  router.get('/admin/stats', authenticateToken, requireAdmin, (req, res) => {
    const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
    const pendingOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'").get().count;
    const completedOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'completed'").get().count;
    const totalRevenue = db.prepare("SELECT COALESCE(SUM(total_price), 0) as total FROM orders WHERE status IN ('paid', 'completed')").get().total;
    const totalAccounts = db.prepare('SELECT COUNT(*) as count FROM accounts').get().count;
    const availableAccounts = db.prepare("SELECT COUNT(*) as count FROM accounts WHERE status = 'available'").get().count;
    const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'user'").get().count;

    res.json({ totalOrders, pendingOrders, completedOrders, totalRevenue, totalAccounts, availableAccounts, totalUsers });
  });

  // PUT /api/orders/:id/status - Update order status (admin)
  router.put('/:id/status', authenticateToken, requireAdmin, (req, res) => {
    const { status } = req.body;

    if (!['pending', 'paid', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Trạng thái không hợp lệ' });
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    }

    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);

    // Update account status based on order status
    if (status === 'completed' || status === 'paid') {
      db.prepare("UPDATE accounts SET status = 'sold' WHERE id = ?").run(order.account_id);
    } else if (status === 'cancelled') {
      db.prepare("UPDATE accounts SET status = 'available' WHERE id = ?").run(order.account_id);
    }

    res.json({ message: 'Cập nhật trạng thái thành công!' });
  });

  return router;
};

function getPaymentInfo(method, amount, orderCode) {
  if (method === 'momo') {
    return {
      type: 'momo',
      phone: '0909123456',
      name: 'TFT ACC SHOP',
      content: orderCode,
      amount,
      qrData: `2|99|0909123456|||0|0|${amount}|${orderCode}|transfer_myqr`
    };
  }

  return {
    type: 'banking',
    bank: 'MB Bank',
    bankCode: 'MB',
    accountNumber: '0123456789',
    accountName: 'TFT ACC SHOP',
    content: orderCode,
    amount,
    qrUrl: `https://img.vietqr.io/image/MB-0123456789-compact2.png?amount=${amount}&addInfo=${orderCode}&accountName=TFT%20ACC%20SHOP`
  };
}
