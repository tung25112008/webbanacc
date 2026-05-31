document.addEventListener('DOMContentLoaded', () => {
  if (!api.getToken()) {
    window.location.href = '/login.html';
    return;
  }
  loadCart();
});

async function loadCart() {
  const container = document.getElementById('cart-items-container');
  const summary = document.getElementById('cart-summary');
  
  try {
    const res = await api.get('/cart');
    
    if (res.items.length === 0) {
      container.innerHTML = `
        <div class="cart-empty">
          <div class="cart-empty-icon">🛒</div>
          <h3>Giỏ hàng trống</h3>
          <p>Bạn chưa thêm tài khoản nào vào giỏ hàng.</p>
          <a href="/accounts.html" class="btn btn-primary mt-4" style="margin-top: 16px;">Khám phá ngay</a>
        </div>
      `;
      summary.style.display = 'none';
      return;
    }

    summary.style.display = 'block';
    
    // Render items
    container.innerHTML = res.items.map(item => {
      let imageHTML = `<div class="cart-item-image">🎮</div>`;
      try {
        const images = JSON.parse(item.images);
        if (images && images.length > 0) {
          imageHTML = `<img src="${images[0]}" class="cart-item-image" style="object-fit: cover;">`;
        }
      } catch(e) {}

      return `
        <div class="cart-item" id="cart-item-${item.id}">
          ${imageHTML}
          <div class="cart-item-info">
            <div class="cart-item-rank">${item.rank_tier} • SV: ${item.server}</div>
            <a href="/account-detail.html?id=${item.id}" class="cart-item-title">${item.title}</a>
            <div class="cart-item-price">${formatCurrency(item.price)}</div>
          </div>
          <button class="cart-item-remove" onclick="removeFromCart(${item.id})" title="Xóa">🗑️</button>
        </div>
      `;
    }).join('');

    // Update summary
    document.getElementById('summary-count').textContent = res.count;
    document.getElementById('summary-total').textContent = formatCurrency(res.total);
    
  } catch (err) {
    console.error('Failed to load cart:', err);
    container.innerHTML = `<div class="error">Lỗi tải giỏ hàng: ${err.message}</div>`;
  }
}

async function removeFromCart(id) {
  try {
    const res = await api.delete(`/cart/${id}`);
    showToast(res.message, 'success');
    updateCartCount();
    loadCart(); // Reload whole cart to recalculate totals safely
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function proceedToCheckout() {
  window.location.href = '/checkout.html';
}
