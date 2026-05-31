let cartData = null;
let selectedPaymentMethod = 'banking';

document.addEventListener('DOMContentLoaded', async () => {
  if (!api.getToken()) {
    window.location.href = '/login.html';
    return;
  }

  await loadCheckoutData();
  setupPaymentMethodSelection();
});

async function loadCheckoutData() {
  try {
    const res = await api.get('/cart');
    cartData = res;

    if (cartData.items.length === 0) {
      window.location.href = '/cart.html';
      return;
    }

    document.getElementById('checkout-count').textContent = cartData.count;
    document.getElementById('checkout-total').textContent = formatCurrency(cartData.total);

  } catch (err) {
    console.error('Failed to load checkout:', err);
    showToast('Không thể tải thông tin thanh toán', 'error');
  }
}

function setupPaymentMethodSelection() {
  const methods = document.querySelectorAll('.payment-method');
  methods.forEach(method => {
    method.addEventListener('click', () => {
      methods.forEach(m => m.classList.remove('active'));
      method.classList.add('active');
      selectedPaymentMethod = method.dataset.method;
    });
  });
}

async function placeOrder() {
  if (!cartData || cartData.items.length === 0) return;

  const btn = document.getElementById('place-order-btn');
  btn.disabled = true;
  btn.textContent = 'Đang xử lý...';

  try {
    const accountIds = cartData.items.map(item => item.id);
    
    const res = await api.post('/orders', {
      payment_method: selectedPaymentMethod,
      account_ids: accountIds
    });

    // Update cart badge since it's empty now
    updateCartCount();

    // Show QR and success state
    showPaymentInfo(res);

  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Xác Nhận Đặt Hàng';
  }
}

function showPaymentInfo(orderData) {
  // Hide checkout form, show QR section
  document.getElementById('checkout-form').style.display = 'none';
  const qrSection = document.getElementById('qr-section');
  qrSection.style.display = 'block';
  qrSection.classList.add('fade-in');

  const p = orderData.payment;
  
  if (p.type === 'banking') {
    document.getElementById('qr-image').src = p.qrUrl;
    document.getElementById('payment-details').innerHTML = `
      <div class="payment-info-row">
        <span class="label">Ngân hàng:</span>
        <span class="value">${p.bank}</span>
      </div>
      <div class="payment-info-row">
        <span class="label">Số tài khoản:</span>
        <span class="value">${p.accountNumber} <button class="copy-btn" onclick="copyText('${p.accountNumber}')">Copy</button></span>
      </div>
      <div class="payment-info-row">
        <span class="label">Chủ tài khoản:</span>
        <span class="value">${p.accountName}</span>
      </div>
      <div class="payment-info-row">
        <span class="label">Số tiền:</span>
        <span class="value" style="color: var(--red); font-size: 1.1rem;">${formatCurrency(p.amount)} <button class="copy-btn" onclick="copyText('${p.amount}')">Copy</button></span>
      </div>
      <div class="payment-info-row">
        <span class="label">Nội dung CK:</span>
        <span class="value" style="color: var(--gold);">${p.content} <button class="copy-btn" onclick="copyText('${p.content}')">Copy</button></span>
      </div>
    `;
  } else {
    // Momo fake QR generation (real one requires MoMo API)
    // Using a placeholder QR for demo purposes
    document.getElementById('qr-image').src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(p.qrData)}&color=a50064`;
    document.getElementById('payment-details').innerHTML = `
      <div class="payment-info-row">
        <span class="label">Ví Momo:</span>
        <span class="value">${p.phone} <button class="copy-btn" onclick="copyText('${p.phone}')">Copy</button></span>
      </div>
      <div class="payment-info-row">
        <span class="label">Tên người nhận:</span>
        <span class="value">${p.name}</span>
      </div>
      <div class="payment-info-row">
        <span class="label">Số tiền:</span>
        <span class="value" style="color: var(--red); font-size: 1.1rem;">${formatCurrency(p.amount)} <button class="copy-btn" onclick="copyText('${p.amount}')">Copy</button></span>
      </div>
      <div class="payment-info-row">
        <span class="label">Lời nhắn:</span>
        <span class="value" style="color: var(--gold);">${p.content} <button class="copy-btn" onclick="copyText('${p.content}')">Copy</button></span>
      </div>
    `;
  }

  // Start countdown simulator for auto verification
  startVerificationSimulation();
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Đã copy', 'success');
  });
}
window.copyText = copyText;

function startVerificationSimulation() {
  const statusEl = document.getElementById('payment-status-text');
  let dots = 0;
  
  const interval = setInterval(() => {
    dots = (dots + 1) % 4;
    statusEl.textContent = 'Hệ thống đang chờ nhận tiền' + '.'.repeat(dots);
  }, 500);

  // Fake verification success after 10-15s
  setTimeout(() => {
    clearInterval(interval);
    statusEl.innerHTML = '<span style="color: var(--green);">✅ Thanh toán thành công!</span><br>Tài khoản đã được gửi vào email của bạn.';
    setTimeout(() => {
      window.location.href = '/';
    }, 4000);
  }, 12000);
}
