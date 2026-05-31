// Registration
const registerForm = document.getElementById('register-form');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btn = registerForm.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Đang đăng ký...';
    
    const errorMsg = document.getElementById('register-error');
    errorMsg.textContent = '';
    
    const data = {
      username: registerForm.username.value,
      email: registerForm.email.value,
      password: registerForm.password.value,
      confirmPassword: registerForm.confirmPassword.value
    };
    
    try {
      const res = await api.post('/auth/register', data);
      api.setToken(res.token);
      localStorage.setItem('tft_user', JSON.stringify(res.user));
      
      showToast('Đăng ký thành công!', 'success');
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (err) {
      errorMsg.textContent = err.message;
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
}

// Login
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btn = loginForm.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Đang đăng nhập...';
    
    const errorMsg = document.getElementById('login-error');
    errorMsg.textContent = '';
    
    const data = {
      username: loginForm.username.value,
      password: loginForm.password.value
    };
    
    try {
      const res = await api.post('/auth/login', data);
      api.setToken(res.token);
      localStorage.setItem('tft_user', JSON.stringify(res.user));
      
      showToast('Đăng nhập thành công!', 'success');
      
      // Redirect admin to admin panel, users to home or previous page
      setTimeout(() => {
        if (res.user.role === 'admin') {
          window.location.href = '/admin.html';
        } else {
          // If came from cart/checkout, go back, else home
          window.location.href = '/';
        }
      }, 1000);
      
    } catch (err) {
      errorMsg.textContent = err.message;
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
}

// Check if already logged in
document.addEventListener('DOMContentLoaded', () => {
  if (api.getToken() && getStoredUser()) {
    window.location.href = '/';
  }
});
