document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  loadFeaturedAccounts();
  loadRecentAccounts();
});

async function loadStats() {
  try {
    const stats = await api.get('/accounts/stats');
    
    // Animate counter function
    const animateValue = (id, start, end, duration) => {
      const obj = document.getElementById(id);
      if (!obj) return;
      let startTimestamp = null;
      const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
          window.requestAnimationFrame(step);
        }
      };
      window.requestAnimationFrame(step);
    }

    animateValue('stat-accounts', 0, stats.totalAccounts, 1500);
    animateValue('stat-sold', 0, stats.soldAccounts, 1500);
    animateValue('stat-users', 0, stats.totalUsers, 1500);
    animateValue('stat-orders', 0, stats.totalOrders, 1500);
    
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

async function loadFeaturedAccounts() {
  const container = document.getElementById('featured-accounts');
  if (!container) return;

  try {
    // Get featured accounts
    const res = await api.get('/accounts?featured=1&limit=4');
    
    if (res.accounts.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>Chưa có tài khoản nổi bật nào.</p></div>';
      return;
    }

    container.innerHTML = res.accounts.map(acc => createAccountCardHTML(acc)).join('');
  } catch (err) {
    console.error('Failed to load featured accounts:', err);
    container.innerHTML = '<div class="empty-state"><p>Không thể tải danh sách tài khoản.</p></div>';
  }
}

async function loadRecentAccounts() {
  const container = document.getElementById('recent-accounts');
  if (!container) return;

  try {
    // Get newest accounts (not featured to avoid duplication if possible, but simple limit 4 for now)
    const res = await api.get('/accounts?sort=newest&limit=8');
    
    if (res.accounts.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>Chưa có tài khoản nào.</p></div>';
      return;
    }

    container.innerHTML = res.accounts.map(acc => createAccountCardHTML(acc)).join('');
  } catch (err) {
    console.error('Failed to load recent accounts:', err);
    container.innerHTML = '<div class="empty-state"><p>Không thể tải danh sách tài khoản.</p></div>';
  }
}
