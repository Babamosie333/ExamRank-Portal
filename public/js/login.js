(function () {
  if (getToken()) {
    window.location.href = '/dashboard.html';
    return;
  }

  const alertEl = document.getElementById('alert');
  const registerForm = document.getElementById('registerForm');
  const verifyForm = document.getElementById('verifyForm');
  const resendBtn = document.getElementById('resendBtn');

  document.querySelectorAll('.auth-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      const isRegister = tab.dataset.tab === 'register';
      registerForm.classList.toggle('hidden', !isRegister);
      verifyForm.classList.toggle('hidden', isRegister);
      alertEl.innerHTML = '';
    });
  });

  function showError(msg) {
    alertEl.innerHTML = `<div class="alert alert-error">${msg}</div>`;
  }

  function showSuccess(msg) {
    alertEl.innerHTML = `<div class="alert alert-success">${msg}</div>`;
  }

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const data = await apiRequest('/api/student/register', {
        method: 'POST',
        body: JSON.stringify({
          name: document.getElementById('regName').value.trim(),
          email: document.getElementById('regEmail').value.trim(),
        }),
      });

      showSuccess(data.message || 'OTP sent to email. Check inbox.');
      verifyForm.classList.remove('hidden');
      document.querySelectorAll('.auth-tab').forEach((t) => t.classList.remove('active'));
      document.querySelector('.auth-tab[data-tab="verify"]').classList.add('active');

      document.getElementById('verifyEmail').value = data.email || document.getElementById('regEmail').value.trim();
      registerForm.classList.add('hidden');
      verifyForm.classList.remove('hidden');
    } catch (err) {
      showError(err.message);
    }
  });

  verifyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const data = await apiRequest('/api/student/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: document.getElementById('verifyEmail').value.trim(),
          otp: document.getElementById('verifyOtp').value.trim(),
        }),
      });

      setSession(data.token, data.student);
      window.location.href = '/dashboard.html';
    } catch (err) {
      showError(err.message);
    }
  });

  resendBtn.addEventListener('click', async () => {
    try {
      const email = document.getElementById('verifyEmail').value.trim();
      if (!email) {
        showError('Enter your email first');
        return;
      }

      const data = await apiRequest('/api/student/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      showSuccess(data.message || 'OTP resent');
    } catch (err) {
      showError(err.message);
    }
  });
})();
