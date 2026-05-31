const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./database/init');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
const db = initDatabase();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', require('./routes/auth')(db));
app.use('/api/accounts', require('./routes/accounts')(db));
app.use('/api/cart', require('./routes/cart')(db));
app.use('/api/orders', require('./routes/orders')(db));

// Serve SPA - all non-API routes serve index.html or specific pages
app.get('*', (req, res) => {
  // Check if a specific HTML file exists
  const filePath = path.join(__dirname, 'public', req.path);
  if (req.path.endsWith('.html')) {
    return res.sendFile(filePath);
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Lỗi server, vui lòng thử lại sau' });
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║     🎮 TFT ACC SHOP - Server Started     ║
║                                           ║
║   🌐 http://localhost:${PORT}               ║
║   📦 Database: SQLite                     ║
║   👤 Admin: admin / admin123              ║
║   👤 User:  user1 / user123              ║
╚═══════════════════════════════════════════╝
  `);
});
