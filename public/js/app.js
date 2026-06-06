// Global Application Logic

// ─── STATE ───
let currentUser = null;

// ─── UI HELPERS ───

// Toast notification
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '❌';

  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);

  // Remove after 3s
  setTimeout(() => {
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, 3000);
}

window.showToast = showToast;

// Format Currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}
window.formatCurrency = formatCurrency;

// ─── AUTHENTICATION ───

async function checkAuth() {
  const token = api.getToken();
  if (!token) return null;

  try {
    const data = await api.get('/auth/me');
    currentUser = data.user;
    localStorage.setItem('tft_user', JSON.stringify(currentUser));
    return currentUser;
  } catch (err) {
    console.error('Auth check failed:', err);
    api.setToken(null);
    localStorage.removeItem('tft_user');
    return null;
  }
}

function getStoredUser() {
  const stored = localStorage.getItem('tft_user');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch(e) {}
  }
  return null;
}

function logout() {
  api.setToken(null);
  localStorage.removeItem('tft_user');
  window.location.href = '/login.html';
}
window.logout = logout;

// ─── NAVBAR & UI INIT ───

async function updateNavbar() {
  const user = getStoredUser();
  const authSection = document.getElementById('nav-auth');
  
  if (user) {
    authSection.innerHTML = `
      <div class="user-dropdown" id="userDropdown">
        <button class="nav-user-btn" onclick="toggleDropdown(event)">
          👤 ${user.username} ▼
        </button>
        <div class="dropdown-menu" id="dropdownMenu">
          ${user.role === 'admin' ? '<a href="/admin.html">⚙️ Admin Panel</a>' : ''}
          <div class="dropdown-divider"></div>
          <button onclick="logout()" class="text-red">🚪 Đăng xuất</button>
        </div>
      </div>
    `;
    updateCartCount();
  } else {
    authSection.innerHTML = `
      <a href="/login.html" class="btn btn-secondary btn-sm">Đăng nhập</a>
      <a href="/register.html" class="btn btn-primary btn-sm">Đăng ký</a>
    `;
  }
}

function toggleDropdown(e) {
  e.stopPropagation();
  const menu = document.getElementById('dropdownMenu');
  if (menu) {
    menu.classList.toggle('show');
  }
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  const menu = document.getElementById('dropdownMenu');
  if (menu && menu.classList.contains('show') && !e.target.closest('.user-dropdown')) {
    menu.classList.remove('show');
  }
});

async function updateCartCount() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;

  if (!api.getToken()) {
    badge.dataset.count = '0';
    badge.textContent = '';
    return;
  }

  try {
    const data = await api.get('/cart/count');
    badge.dataset.count = data.count;
    badge.textContent = data.count > 9 ? '9+' : data.count;
  } catch (err) {
    console.error('Failed to update cart count:', err);
  }
}
window.updateCartCount = updateCartCount;

// Mobile Menu Toggle
function setupMobileMenu() {
  const toggleBtn = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');
  
  if (toggleBtn && navLinks) {
    toggleBtn.addEventListener('click', () => {
      navLinks.classList.toggle('show');
    });
  }
}

// Navbar Scroll Effect
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (nav) {
    if (window.scrollY > 50) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }
});

// Common Account Card Renderer
function createAccountCardHTML(acc) {
  const priceFormatted = formatCurrency(acc.price);
  const originalPriceHTML = acc.original_price ? `<span class="original">${formatCurrency(acc.original_price)}</span>` : '';
  const discountBadge = acc.original_price ? `<div class="card-discount-badge">Giảm ${Math.round((1 - acc.price / acc.original_price) * 100)}%</div>` : '';
  const rankClass = `rank-${acc.rank_tier.toLowerCase()}`;
  
  // Use placeholder image if no images available
  let imgHTML = `<div class="card-image-placeholder">🎮</div>`;
  try {
    const images = JSON.parse(acc.images);
    if (images && images.length > 0) {
      imgHTML = `<img src="${images[0]}" alt="${acc.title}" style="width: 100%; height: 100%; object-fit: cover;">`;
    }
  } catch(e) {}

  return `
    <div class="account-card" onclick="window.location.href='/account-detail.html?id=${acc.id}'">
      <div class="card-image">
        ${imgHTML}
        <div class="card-rank-badge ${rankClass}">${acc.rank_tier}</div>
        ${discountBadge}
        <div class="card-server-badge">SV: ${acc.server}</div>
      </div>
      <div class="card-body">
        <h3 class="card-title">${acc.title}</h3>
        
        <div class="card-stats">
          <div class="card-stat">
            <div class="card-stat-value">${acc.tacticians}</div>
            <div class="card-stat-label">Tacticians</div>
          </div>
          <div class="card-stat">
            <div class="card-stat-value">${acc.little_legends}</div>
            <div class="card-stat-label">Little Legends</div>
          </div>
          <div class="card-stat">
            <div class="card-stat-value">${acc.arenas}</div>
            <div class="card-stat-label">Arenas</div>
          </div>
        </div>
        
        <div class="card-footer">
          <div class="card-price">
            <span class="current">${priceFormatted}</span>
            ${originalPriceHTML}
          </div>
          <button class="card-buy-btn" onclick="event.stopPropagation(); addToCart(${acc.id})">Mua Ngay</button>
        </div>
      </div>
    </div>
  `;
}
window.createAccountCardHTML = createAccountCardHTML;

// Global add to cart func
async function addToCart(accountId, quantity = 1) {
  if (!api.getToken()) {
    showToast('Vui lòng đăng nhập để thêm vào giỏ hàng', 'error');
    setTimeout(() => { window.location.href = '/login.html'; }, 1500);
    return;
  }

  try {
    const res = await api.post('/cart', { account_id: accountId, quantity });
    showToast(res.message, 'success');
    updateCartCount();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
window.addToCart = addToCart;

// ─── INITIALIZATION ───

document.addEventListener('DOMContentLoaded', async () => {
  // Setup common UI
  setupMobileMenu();
  
  // Create toast container if not exists
  if (!document.getElementById('toast-container')) {
    const tc = document.createElement('div');
    tc.id = 'toast-container';
    tc.className = 'toast-container';
    document.body.appendChild(tc);
  }

  // Check auth and update UI
  if (api.getToken() && !getStoredUser()) {
    await checkAuth();
  }
  updateNavbar();
});
