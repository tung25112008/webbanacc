const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

module.exports = function(db) {
  const router = express.Router();

  // GET /api/accounts - List with filters
  router.get('/', (req, res) => {
    let { page, limit, rank, server, min_price, max_price, sort, search, status, featured } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 12;
    const offset = (page - 1) * limit;

    let where = [];
    let params = [];

    // Default: only show available
    if (status) {
      where.push('status = ?');
      params.push(status);
    } else {
      where.push("status = 'available'");
    }

    if (rank) {
      where.push('rank_tier = ?');
      params.push(rank);
    }

    if (server) {
      where.push('server = ?');
      params.push(server);
    }

    if (min_price) {
      where.push('price >= ?');
      params.push(parseInt(min_price));
    }

    if (max_price) {
      where.push('price <= ?');
      params.push(parseInt(max_price));
    }

    if (featured === '1') {
      where.push('is_featured = 1');
    }

    if (search) {
      where.push('(title LIKE ? OR description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    // Sort
    let orderBy = 'ORDER BY created_at DESC';
    if (sort === 'price_asc') orderBy = 'ORDER BY price ASC';
    else if (sort === 'price_desc') orderBy = 'ORDER BY price DESC';
    else if (sort === 'rank') orderBy = "ORDER BY CASE rank_tier WHEN 'Challenger' THEN 1 WHEN 'Grandmaster' THEN 2 WHEN 'Master' THEN 3 WHEN 'Diamond' THEN 4 WHEN 'Emerald' THEN 5 WHEN 'Platinum' THEN 6 WHEN 'Gold' THEN 7 WHEN 'Silver' THEN 8 WHEN 'Bronze' THEN 9 WHEN 'Iron' THEN 10 END ASC";
    else if (sort === 'newest') orderBy = 'ORDER BY created_at DESC';

    // Count total
    const countQuery = `SELECT COUNT(*) as total FROM accounts ${whereClause}`;
    const total = db.prepare(countQuery).get(...params).total;

    // Get data
    const dataQuery = `SELECT * FROM accounts ${whereClause} ${orderBy} LIMIT ? OFFSET ?`;
    const accounts = db.prepare(dataQuery).all(...params, limit, offset);

    res.json({
      accounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  });

  // GET /api/accounts/stats - Stats for homepage
  router.get('/stats', (req, res) => {
    const totalAccounts = db.prepare("SELECT COUNT(*) as count FROM accounts WHERE status = 'available'").get().count;
    const soldAccounts = db.prepare("SELECT COUNT(*) as count FROM accounts WHERE status = 'sold'").get().count;
    const totalOrders = db.prepare("SELECT COUNT(*) as count FROM orders").get().count;
    const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'user'").get().count;

    res.json({ totalAccounts, soldAccounts, totalOrders, totalUsers });
  });

  // GET /api/accounts/:id - Single account
  router.get('/:id', (req, res) => {
    const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.id);
    if (!account) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
    }
    // Hide credentials from regular users
    const isAdmin = req.headers.authorization && (() => {
      try {
        const jwt = require('jsonwebtoken');
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tft_secret_key_2024');
        return decoded.role === 'admin';
      } catch(e) { return false; }
    })();
    if (!isAdmin) {
      const { acc_username, acc_password, acc_email, ...safeAccount } = account;
      return res.json({ account: safeAccount });
    }
    res.json({ account });
  });

  // POST /api/accounts - Create (admin only)
  router.post('/', authenticateToken, requireAdmin, (req, res) => {
    const { title, description, price, original_price, rank_tier, level, little_legends, arenas, tacticians, server, images, is_featured, acc_username, acc_password, acc_email } = req.body;

    if (!title || !price || !rank_tier) {
      return res.status(400).json({ error: 'Vui lòng điền tên, giá và rank' });
    }

    const result = db.prepare(`
      INSERT INTO accounts (title, description, price, original_price, rank_tier, level, little_legends, arenas, tacticians, server, images, is_featured, acc_username, acc_password, acc_email)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title, description || '', parseInt(price), original_price ? parseInt(original_price) : null,
      rank_tier, parseInt(level) || 1, parseInt(little_legends) || 0, parseInt(arenas) || 0,
      parseInt(tacticians) || 0, server || 'VN', images || '[]', is_featured ? 1 : 0,
      acc_username || null, acc_password || null, acc_email || null
    );

    const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(Number(result.lastInsertRowid));
    res.json({ message: 'Thêm tài khoản thành công!', account });
  });

  // PUT /api/accounts/:id - Update (admin only)
  router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
    const { title, description, price, original_price, rank_tier, level, little_legends, arenas, tacticians, server, images, status, is_featured, acc_username, acc_password, acc_email } = req.body;

    const existing = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
    }

    db.prepare(`
      UPDATE accounts SET
        title = ?, description = ?, price = ?, original_price = ?, rank_tier = ?,
        level = ?, little_legends = ?, arenas = ?, tacticians = ?,
        server = ?, images = ?, status = ?, is_featured = ?,
        acc_username = ?, acc_password = ?, acc_email = ?
      WHERE id = ?
    `).run(
      title || existing.title,
      description !== undefined ? description : existing.description,
      price ? parseInt(price) : existing.price,
      original_price !== undefined ? (original_price ? parseInt(original_price) : null) : existing.original_price,
      rank_tier || existing.rank_tier,
      level ? parseInt(level) : existing.level,
      little_legends !== undefined ? parseInt(little_legends) : existing.little_legends,
      arenas !== undefined ? parseInt(arenas) : existing.arenas,
      tacticians !== undefined ? parseInt(tacticians) : existing.tacticians,
      server || existing.server,
      images || existing.images,
      status || existing.status,
      is_featured !== undefined ? (is_featured ? 1 : 0) : existing.is_featured,
      acc_username !== undefined ? acc_username : existing.acc_username,
      acc_password !== undefined ? acc_password : existing.acc_password,
      acc_email !== undefined ? acc_email : existing.acc_email,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.id);
    res.json({ message: 'Cập nhật thành công!', account: updated });
  });

  // DELETE /api/accounts/:id - Delete (admin only)
  router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
    const existing = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
    }

    // Remove from all carts first
    db.prepare('DELETE FROM cart_items WHERE account_id = ?').run(req.params.id);
    db.prepare('DELETE FROM accounts WHERE id = ?').run(req.params.id);

    res.json({ message: 'Xóa tài khoản thành công!' });
  });

  // GET /api/accounts/admin/all - Get all including sold (admin)
  router.get('/admin/all', authenticateToken, requireAdmin, (req, res) => {
    const accounts = db.prepare('SELECT * FROM accounts ORDER BY created_at DESC').all();
    res.json({ accounts });
  });

  return router;
};
