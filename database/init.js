const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const path = require('path');

// On Render: use /data (persistent disk). Locally: use __dirname
const DB_DIR = process.env.NODE_ENV === 'production' ? '/data' : __dirname;
const DB_PATH = path.join(DB_DIR, 'tft_shop.db');

function initDatabase() {
  const db = new DatabaseSync(DB_PATH);

  // Enable WAL mode for better performance
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

  // Custom transaction wrapper for node:sqlite
  db.transaction = function(fn) {
    return function(...args) {
      db.exec('BEGIN TRANSACTION');
      try {
        const result = fn(...args);
        db.exec('COMMIT');
        return result;
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    };
  };

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      price INTEGER NOT NULL,
      original_price INTEGER,
      rank_tier TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      little_legends INTEGER DEFAULT 0,
      arenas INTEGER DEFAULT 0,
      tacticians INTEGER DEFAULT 0,
      server TEXT DEFAULT 'VN',
      images TEXT DEFAULT '[]',
      status TEXT DEFAULT 'available' CHECK(status IN ('available', 'sold', 'reserved')),
      is_featured INTEGER DEFAULT 0,
      acc_username TEXT,
      acc_password TEXT,
      acc_email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_code TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      account_id INTEGER NOT NULL,
      total_price INTEGER NOT NULL,
      payment_method TEXT DEFAULT 'banking',
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'completed', 'cancelled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      account_id INTEGER NOT NULL,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (account_id) REFERENCES accounts(id),
      UNIQUE(user_id, account_id)
    );
  `);

  // Migrate existing DB: add credential columns if they don't exist
  try { db.exec('ALTER TABLE accounts ADD COLUMN acc_username TEXT'); } catch(e) {}
  try { db.exec('ALTER TABLE accounts ADD COLUMN acc_password TEXT'); } catch(e) {}
  try { db.exec('ALTER TABLE accounts ADD COLUMN acc_email TEXT'); } catch(e) {}

  // Seed data if tables are empty
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    seedData(db);
  }

  return db;
}

function seedData(db) {
  // Create admin and test user
  const adminPass = bcrypt.hashSync('admin123', 10);
  const userPass = bcrypt.hashSync('user123', 10);

  const insertUser = db.prepare('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)');
  insertUser.run('admin', 'admin@tftshop.vn', adminPass, 'admin');
  insertUser.run('user1', 'user1@gmail.com', userPass, 'user');

  // Seed TFT accounts
  const insertAccount = db.prepare(`
    INSERT INTO accounts (title, description, price, original_price, rank_tier, level, little_legends, arenas, tacticians, server, images, status, is_featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const accounts = [
    {
      title: 'ACC Challenger Full Chibi | 200+ Tactician',
      description: 'Tài khoản Challenger mùa 11 với hơn 200 tactician, đầy đủ chibi champion hiếm. Skin arena độc quyền. Lịch sử rank ổn định top 50 server VN.',
      price: 5000000,
      original_price: 6500000,
      rank_tier: 'Challenger',
      level: 450,
      little_legends: 85,
      arenas: 42,
      tacticians: 210,
      server: 'VN',
      is_featured: 1
    },
    {
      title: 'ACC Grandmaster Mùa 12 | Full Arena',
      description: 'Grandmaster đỉnh cao với collection arena đầy đủ. Nhiều Little Legend huyền thoại. Rank ổn định qua nhiều mùa.',
      price: 3500000,
      original_price: 4200000,
      rank_tier: 'Grandmaster',
      level: 380,
      little_legends: 65,
      arenas: 38,
      tacticians: 150,
      server: 'VN',
      is_featured: 1
    },
    {
      title: 'ACC Master | Chibi Yasuo + Chibi Lee Sin',
      description: 'Master rank với 2 chibi hiếm nhất game: Chibi Yasuo và Chibi Lee Sin. Arena premium collection. Perfect cho người sưu tầm.',
      price: 2800000,
      original_price: 3500000,
      rank_tier: 'Master',
      level: 320,
      little_legends: 45,
      arenas: 28,
      tacticians: 120,
      server: 'VN',
      is_featured: 1
    },
    {
      title: 'ACC Diamond I | Giá Tốt Cho Newbie',
      description: 'Diamond I sạch, chưa gắn SĐT. Có sẵn nhiều Little Legend đẹp. Phù hợp cho bạn muốn bắt đầu rank cao.',
      price: 800000,
      original_price: 1200000,
      rank_tier: 'Diamond',
      level: 200,
      little_legends: 25,
      arenas: 15,
      tacticians: 60,
      server: 'VN',
      is_featured: 1
    },
    {
      title: 'ACC Emerald Full Pass Mùa 10-12',
      description: 'Emerald rank ổn định. Đã mua đầy đủ battle pass từ mùa 10 đến mùa 12. Nhiều item độc quyền từ pass.',
      price: 600000,
      original_price: 900000,
      rank_tier: 'Emerald',
      level: 180,
      little_legends: 30,
      arenas: 20,
      tacticians: 80,
      server: 'VN',
      is_featured: 0
    },
    {
      title: 'ACC Platinum | Little Legend Huyền Thoại',
      description: 'Platinum rank với bộ sưu tập Little Legend huyền thoại rare. Pengu Star Guardian, Silverwing Mythic. Giá hời.',
      price: 450000,
      original_price: 650000,
      rank_tier: 'Platinum',
      level: 150,
      little_legends: 40,
      arenas: 12,
      tacticians: 45,
      server: 'VN',
      is_featured: 0
    },
    {
      title: 'ACC Master Server KR | Top 200',
      description: 'Tài khoản Master server Hàn Quốc, từng lọt top 200. Cực hiếm với skin và tactician exclusive KR server.',
      price: 4500000,
      original_price: 5500000,
      rank_tier: 'Master',
      level: 350,
      little_legends: 55,
      arenas: 30,
      tacticians: 130,
      server: 'KR',
      is_featured: 1
    },
    {
      title: 'ACC Gold Sạch | Chưa Gắn Mail',
      description: 'Gold rank sạch hoàn toàn, chưa gắn email hay SĐT. Dễ dàng đổi thông tin. Có sẵn một số Little Legend cơ bản.',
      price: 150000,
      original_price: null,
      rank_tier: 'Gold',
      level: 80,
      little_legends: 8,
      arenas: 5,
      tacticians: 15,
      server: 'VN',
      is_featured: 0
    },
    {
      title: 'ACC Diamond Server SG | Chibi Jinx',
      description: 'Diamond rank server Singapore. Sở hữu Chibi Jinx siêu hiếm cùng nhiều arena skin đẹp.',
      price: 1500000,
      original_price: 2000000,
      rank_tier: 'Diamond',
      level: 250,
      little_legends: 35,
      arenas: 22,
      tacticians: 90,
      server: 'SG',
      is_featured: 1
    },
    {
      title: 'ACC Silver | Starter Pack Giá Rẻ',
      description: 'Acc Silver giá rẻ nhất shop. Phù hợp cho người mới bắt đầu chơi TFT, có sẵn vài Little Legend.',
      price: 50000,
      original_price: null,
      rank_tier: 'Silver',
      level: 40,
      little_legends: 3,
      arenas: 2,
      tacticians: 5,
      server: 'VN',
      is_featured: 0
    },
    {
      title: 'ACC Challenger Server SG | Collector Edition',
      description: 'Challenger server SG với bộ sưu tập khổng lồ. Hơn 250 tactician, 90+ Little Legend, 50+ Arena. Acc siêu VIP.',
      price: 7500000,
      original_price: 9000000,
      rank_tier: 'Challenger',
      level: 500,
      little_legends: 95,
      arenas: 52,
      tacticians: 260,
      server: 'SG',
      is_featured: 1
    },
    {
      title: 'ACC Platinum | Full Chibi Set 1-5',
      description: 'Platinum rank với đầy đủ Chibi từ Set 1 đến Set 5. Bộ sưu tập OG cực hiếm cho fan lâu năm.',
      price: 1200000,
      original_price: 1800000,
      rank_tier: 'Platinum',
      level: 220,
      little_legends: 50,
      arenas: 18,
      tacticians: 100,
      server: 'VN',
      is_featured: 0
    }
  ];

  const insertMany = db.transaction((items) => {
    for (const acc of items) {
      insertAccount.run(
        acc.title,
        acc.description,
        acc.price,
        acc.original_price,
        acc.rank_tier,
        acc.level,
        acc.little_legends,
        acc.arenas,
        acc.tacticians,
        acc.server,
        '[]',
        'available',
        acc.is_featured
      );
    }
  });

  insertMany(accounts);
  console.log('✅ Database seeded with', accounts.length, 'TFT accounts');
}

module.exports = { initDatabase };
