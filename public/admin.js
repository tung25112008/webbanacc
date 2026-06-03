document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuth();
  if (!user || user.role !== 'admin') {
    showToast('Bạn không có quyền truy cập', 'error');
    window.location.href = '/';
    return;
  }

  loadAdminStats();
  loadAdminAccounts();
});

function switchTab(tabId) {
  // Update buttons
  document.querySelectorAll('.admin-tab').forEach(btn => btn.classList.remove('active'));
  document.querySelector(`[onclick="switchTab('${tabId}')"]`).classList.add('active');

  // Update content
  document.getElementById('accounts-tab').style.display = 'none';
  document.getElementById('orders-tab').style.display = 'none';
  document.getElementById(`${tabId}-tab`).style.display = 'block';

  if (tabId === 'orders') {
    loadAdminOrders();
  } else {
    loadAdminAccounts();
  }
}

async function loadAdminStats() {
  try {
    const stats = await api.get('/orders/admin/stats');
    
    document.getElementById('admin-stat-revenue').textContent = formatCurrency(stats.totalRevenue);
    document.getElementById('admin-stat-orders').textContent = stats.totalOrders;
    document.getElementById('admin-stat-accounts').textContent = stats.totalAccounts;
    document.getElementById('admin-stat-users').textContent = stats.totalUsers;
  } catch (err) {
    console.error('Failed to load admin stats:', err);
  }
}

async function loadAdminAccounts() {
  const tbody = document.getElementById('admin-accounts-table');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Đang tải...</td></tr>';
  
  try {
    const res = await api.get('/accounts/admin/all');
    
    if (res.accounts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Chưa có tài khoản nào</td></tr>';
      return;
    }

    tbody.innerHTML = res.accounts.map(acc => `
      <tr>
        <td>#${acc.id}</td>
        <td>
          <div style="font-weight: 600; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${acc.title}">
            ${acc.title}
          </div>
          ${!acc.acc_username ? '<div style="font-size:0.75rem; color: #f59e0b; margin-top:2px;">⚠️ Chưa có thông tin đăng nhập</div>' : '<div style="font-size:0.75rem; color: #10b981; margin-top:2px;">✅ Đã có thông tin đăng nhập</div>'}
        </td>
        <td><span class="detail-rank-badge rank-${acc.rank_tier.toLowerCase()}" style="padding: 2px 8px; font-size: 0.7rem;">${acc.rank_tier}</span></td>
        <td style="color: var(--gold); font-weight: 600;">${formatCurrency(acc.price)}</td>
        <td>${acc.server}</td>
        <td><span class="status-badge status-${acc.status}">${acc.status.toUpperCase()}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="openAccountModal(${acc.id})">Sửa</button>
          <button class="btn btn-danger btn-sm" onclick="deleteAccount(${acc.id})">Xóa</button>
        </td>
      </tr>
    `).join('');
    
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="7" style="color: var(--red); text-align:center;">${err.message}</td></tr>`;
  }
}

async function loadAdminOrders() {
  const tbody = document.getElementById('admin-orders-table');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Đang tải...</td></tr>';
  
  try {
    const res = await api.get('/orders/all');
    
    if (res.orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Chưa có đơn hàng nào</td></tr>';
      return;
    }

    tbody.innerHTML = res.orders.map(order => `
      <tr>
        <td><strong>${order.order_code}</strong></td>
        <td>${order.username}</td>
        <td>
          <div style="max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${order.account_title}">
            ${order.account_title}
          </div>
        </td>
        <td style="color: var(--gold); font-weight: 600;">${formatCurrency(order.total_price)}</td>
        <td>${order.payment_method.toUpperCase()}</td>
        <td><span class="status-badge status-${order.status}">${order.status.toUpperCase()}</span></td>
        <td>
          <select class="form-select" style="padding: 4px 8px; width: auto;" onchange="updateOrderStatus(${order.id}, this.value)">
            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="paid" ${order.status === 'paid' ? 'selected' : ''}>Paid</option>
            <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </td>
      </tr>
    `).join('');
    
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="7" style="color: var(--red); text-align:center;">${err.message}</td></tr>`;
  }
}

async function updateOrderStatus(orderId, status) {
  try {
    const res = await api.put(`/orders/${orderId}/status`, { status });
    showToast(res.message, 'success');
    loadAdminStats(); // Refresh stats
  } catch (err) {
    showToast(err.message, 'error');
    loadAdminOrders(); // Reset dropdown on error
  }
}

async function deleteAccount(id) {
  if (!confirm('Bạn có chắc chắn muốn xóa tài khoản này?')) return;
  
  try {
    const res = await api.delete(`/accounts/${id}`);
    showToast(res.message, 'success');
    loadAdminAccounts();
    loadAdminStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ─── MODAL LOGIC ───

let editingAccountId = null;

function openAccountModal(id = null) {
  const modal = document.getElementById('accountModal');
  const title = document.getElementById('modalTitle');
  const form = document.getElementById('accountForm');
  
  form.reset();
  editingAccountId = id;

  if (id) {
    title.textContent = 'Chỉnh sửa tài khoản';
    // Fetch data and fill form — use admin/all to get credentials
    api.get(`/accounts/admin/all`).then(res => {
      const acc = res.accounts.find(a => a.id === id);
      if (!acc) { showToast('Không tìm thấy tài khoản', 'error'); closeModal(); return; }
      form.title.value = acc.title;
      form.price.value = acc.price;
      form.original_price.value = acc.original_price || '';
      form.rank_tier.value = acc.rank_tier;
      form.level.value = acc.level;
      form.little_legends.value = acc.little_legends;
      form.arenas.value = acc.arenas;
      form.tacticians.value = acc.tacticians;
      form.server.value = acc.server;
      form.status.value = acc.status;
      form.is_featured.value = acc.is_featured;
      form.description.value = acc.description;
      form.acc_username.value = acc.acc_username || '';
      form.acc_password.value = acc.acc_password || '';
      form.acc_email.value = acc.acc_email || '';
    }).catch(err => {
      showToast(err.message, 'error');
      closeModal();
      return;
    });
  } else {
    title.textContent = 'Thêm tài khoản mới';
  }

  modal.classList.add('show');
}

function closeModal() {
  document.getElementById('accountModal').classList.remove('show');
}

document.getElementById('accountForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const form = e.target;
  const data = {
    title: form.title.value,
    price: parseInt(form.price.value),
    original_price: form.original_price.value ? parseInt(form.original_price.value) : null,
    rank_tier: form.rank_tier.value,
    level: parseInt(form.level.value),
    little_legends: parseInt(form.little_legends.value),
    arenas: parseInt(form.arenas.value),
    tacticians: parseInt(form.tacticians.value),
    server: form.server.value,
    status: form.status.value,
    is_featured: parseInt(form.is_featured.value),
    description: form.description.value,
    acc_username: form.acc_username.value.trim() || null,
    acc_password: form.acc_password.value.trim() || null,
    acc_email: form.acc_email.value.trim() || null,
    images: '[]'
  };

  try {
    let res;
    if (editingAccountId) {
      res = await api.put(`/accounts/${editingAccountId}`, data);
    } else {
      res = await api.post('/accounts', data);
    }
    
    showToast(res.message, 'success');
    closeModal();
    loadAdminAccounts();
    loadAdminStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
});
