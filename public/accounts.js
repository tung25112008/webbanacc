// Accounts Listing Logic

let currentPage = 1;
let totalPages = 1;

document.addEventListener('DOMContentLoaded', () => {
  setupFilters();
  loadAccounts();
});

function setupFilters() {
  const searchInput = document.getElementById('search-input');
  const rankFilter = document.getElementById('filter-rank');
  const priceFilter = document.getElementById('filter-price');
  const serverFilter = document.getElementById('filter-server');
  const sortSelect = document.getElementById('sort-select');

  // Add event listeners
  let debounceTimer;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        currentPage = 1;
        loadAccounts();
      }, 500);
    });
  }

  const filters = [rankFilter, priceFilter, serverFilter, sortSelect];
  filters.forEach(el => {
    if (el) {
      el.addEventListener('change', () => {
        currentPage = 1;
        loadAccounts();
      });
    }
  });
}

function getFilterParams() {
  const params = new URLSearchParams();
  
  params.append('page', currentPage);
  params.append('limit', 12);

  const search = document.getElementById('search-input')?.value;
  if (search) params.append('search', search);

  const rank = document.getElementById('filter-rank')?.value;
  if (rank) params.append('rank', rank);

  const server = document.getElementById('filter-server')?.value;
  if (server) params.append('server', server);

  const sort = document.getElementById('sort-select')?.value;
  if (sort) params.append('sort', sort);

  const priceStr = document.getElementById('filter-price')?.value;
  if (priceStr) {
    const [min, max] = priceStr.split('-');
    if (min) params.append('min_price', min);
    if (max && max !== 'max') params.append('max_price', max);
  }

  return params.toString();
}

async function loadAccounts() {
  const container = document.getElementById('accounts-container');
  const pagination = document.getElementById('pagination');
  
  if (!container) return;

  container.innerHTML = `
    <div class="loading-spinner" style="grid-column: 1/-1;">
      <div class="spinner"></div>
    </div>
  `;

  try {
    const query = getFilterParams();
    const res = await api.get(`/accounts?${query}`);
    
    if (res.accounts.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1;">
          <div class="empty-state-icon">🔍</div>
          <h3>Không tìm thấy kết quả</h3>
          <p>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
          <button class="btn btn-secondary" onclick="resetFilters()">Xóa bộ lọc</button>
        </div>
      `;
      if (pagination) pagination.innerHTML = '';
      return;
    }

    // Render cards
    container.innerHTML = res.accounts.map(acc => createAccountCardHTML(acc)).join('');
    
    // Render pagination
    totalPages = res.pagination.totalPages;
    renderPagination(res.pagination.page, totalPages);
    
  } catch (err) {
    console.error('Failed to load accounts:', err);
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <div class="empty-state-icon">⚠️</div>
        <h3>Đã xảy ra lỗi</h3>
        <p>${err.message}</p>
      </div>
    `;
  }
}

function renderPagination(current, total) {
  const container = document.getElementById('pagination');
  if (!container) return;
  
  if (total <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';
  
  // Prev button
  html += `<button onclick="changePage(${current - 1})" ${current === 1 ? 'disabled' : ''}>&laquo;</button>`;
  
  // Pages
  for (let i = 1; i <= total; i++) {
    // Simple logic for small number of pages. For many pages, need ellipsis logic
    if (i === 1 || i === total || (i >= current - 1 && i <= current + 1)) {
      html += `<button onclick="changePage(${i})" class="${i === current ? 'active' : ''}">${i}</button>`;
    } else if (i === current - 2 || i === current + 2) {
      html += `<button disabled>...</button>`;
    }
  }
  
  // Next button
  html += `<button onclick="changePage(${current + 1})" ${current === total ? 'disabled' : ''}>&raquo;</button>`;
  
  container.innerHTML = html;
}

window.changePage = function(page) {
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  loadAccounts();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.resetFilters = function() {
  document.getElementById('search-input').value = '';
  document.getElementById('filter-rank').value = '';
  document.getElementById('filter-price').value = '';
  document.getElementById('filter-server').value = '';
  document.getElementById('sort-select').value = 'newest';
  
  currentPage = 1;
  loadAccounts();
}
