const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

module.exports = function(db) {
  const router = express.Router();

  // Register
  router.post('/register', (req, res) => {
    const { username, email, password, confirmPassword } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Tên đăng nhập phải có ít nhất 3 ký tự' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Mật khẩu xác nhận không khớp' });
    }

    // Check existing
    const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existing) {
      return res.status(400).json({ error: 'Tên đăng nhập hoặc email đã tồn tại' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)').run(username, email, hashedPassword, 'user');
    const insertId = Number(result.lastInsertRowid);

    const token = jwt.sign({ id: insertId, username, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Đăng ký thành công!',
      token,
      user: { id: insertId, username, email, role: 'user' }
    });
  });

  // Login
  router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Đăng nhập thành công!',
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
  });

  // Get current user
  router.get('/me', authenticateToken, (req, res) => {
    const user = db.prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }
    res.json({ user });
  });

  return router;
};
