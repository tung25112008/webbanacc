document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const accountId = urlParams.get('id');

  if (!accountId) {
    window.location.href = '/accounts.html';
    return;
  }

  loadAccountDetails(accountId);
});

async function loadAccountDetails(id) {
  const container = document.getElementById('detail-container');
  
  try {
    const res = await api.get(`/accounts/${id}`);
    const acc = res.account;

    // Set page title
    document.title = `${acc.title} | TFT ACC SHOP`;

    // Process images
    let images = [];
    try {
      images = JSON.parse(acc.images);
    } catch(e) {}

    let imageHTML = `<div class="detail-main-image">🎮</div>`;
    if (images && images.length > 0) {
      imageHTML = `<img src="${images[0]}" alt="${acc.title}" class="detail-main-image" style="object-fit: cover;">`;
    }

    const priceFormatted = formatCurrency(acc.price);
    let priceHTML = `<div class="current">${priceFormatted}</div>`;
    
    if (acc.original_price) {
      const discount = Math.round((1 - acc.price / acc.original_price) * 100);
      priceHTML = `
        <div class="current">${priceFormatted}</div>
        <div class="original">${formatCurrency(acc.original_price)}</div>
        <div class="discount">-${discount}%</div>
      `;
    }

    let statusBtn = '';
    let quantitySelector = '';

    if (acc.status === 'available' && acc.stock > 0) {
      if (acc.type === 'bulk') {
        quantitySelector = `
          <div class="quantity-selector" style="margin-right: 15px; display: flex; align-items: center; gap: 10px;">
            <label for="bulk-qty">Số lượng (Kho: ${acc.stock}):</label>
            <input type="number" id="bulk-qty" value="1" min="1" max="${acc.stock}" style="width: 60px; padding: 5px; border-radius: 4px; border: 1px solid var(--border);">
          </div>
        `;
        statusBtn = `<button class="btn btn-primary" onclick="addBulkToCart(${acc.id})">🛒 Thêm vào giỏ</button>`;
      } else {
        statusBtn = `<button class="btn btn-primary" onclick="addToCart(${acc.id})">🛒 Thêm vào giỏ</button>`;
      }
    } else {
      statusBtn = `<button class="btn btn-secondary" disabled>Đã Bán / Hết Hàng</button>`;
    }

    container.innerHTML = `
      <div class="detail-grid">
        <div class="detail-images">
          ${imageHTML}
        </div>
        
        <div class="detail-info">
          <div class="detail-rank-badge rank-${acc.rank_tier.toLowerCase()}">${acc.rank_tier}</div>
          <h1 class="detail-title">${acc.title}</h1>
          <p class="detail-description">${acc.description.replace(/\n/g, '<br>')}</p>
          
          <div class="detail-stats-grid">
            <div class="detail-stat">
              <div class="detail-stat-icon">👑</div>
              <div class="detail-stat-info">
                <div class="label">Tacticians</div>
                <div class="value">${acc.tacticians}</div>
              </div>
            </div>
            <div class="detail-stat">
              <div class="detail-stat-icon">🐧</div>
              <div class="detail-stat-info">
                <div class="label">Little Legends</div>
                <div class="value">${acc.little_legends}</div>
              </div>
            </div>
            <div class="detail-stat">
              <div class="detail-stat-icon">🏟️</div>
              <div class="detail-stat-info">
                <div class="label">Arenas</div>
                <div class="value">${acc.arenas}</div>
              </div>
            </div>
            <div class="detail-stat">
              <div class="detail-stat-icon">⭐</div>
              <div class="detail-stat-info">
                <div class="label">Level</div>
                <div class="value">${acc.level}</div>
              </div>
            </div>
            <div class="detail-stat">
              <div class="detail-stat-icon">🌐</div>
              <div class="detail-stat-info">
                <div class="label">Server</div>
                <div class="value">${acc.server}</div>
              </div>
            </div>
            <div class="detail-stat">
              <div class="detail-stat-icon">🔑</div>
              <div class="detail-stat-info">
                <div class="label">Status</div>
                <div class="value" style="color: ${acc.status === 'available' ? 'var(--green)' : 'var(--red)'}">
                  ${acc.status === 'available' ? 'Sẵn sàng' : 'Đã bán'}
                </div>
              </div>
            </div>
          </div>
          
          <div class="detail-price-box">
            <div class="detail-price">
              ${priceHTML}
            </div>
            <div class="detail-actions" style="display: flex; align-items: center;">
              ${quantitySelector}
              ${statusBtn}
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    console.error('Failed to load detail:', err);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Không tìm thấy tài khoản</h3>
        <p>${err.message}</p>
        <a href="/accounts.html" class="btn btn-primary mt-4">Quay lại danh sách</a>
      </div>
    `;
  }
}

async function addBulkToCart(accountId) {
  const qtyInput = document.getElementById('bulk-qty');
  const quantity = qtyInput ? parseInt(qtyInput.value) : 1;
  await addToCart(accountId, quantity);
}
