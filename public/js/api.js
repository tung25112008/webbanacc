// API Client Wrapper
const API_URL = '/api';

const api = {
  // Get token from localStorage
  getToken() {
    return localStorage.getItem('tft_token');
  },

  // Set token to localStorage
  setToken(token) {
    if (token) {
      localStorage.setItem('tft_token', token);
    } else {
      localStorage.removeItem('tft_token');
    }
  },

  // Base request method
  async request(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    
    // Setup headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add auth token if available
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Đã có lỗi xảy ra');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  // Helper methods
  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
};

window.api = api;
