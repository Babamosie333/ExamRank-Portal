const API_BASE = '';

// Fix 5: Admin auth now relies entirely on the httpOnly cookie set by the server.
// We no longer store the token in localStorage — that was redundant and less secure
// because JS-accessible storage is vulnerable to XSS. The cookie is httpOnly so JS
// cannot read or steal it. Every request just sends credentials: 'include'.

async function apiRequest(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const fetchOptions = {
    credentials: 'include', // sends the httpOnly adminToken cookie automatically
    headers,
    ...options,
  };

  // auto-serialize plain objects to JSON
  if (
    fetchOptions.body &&
    typeof fetchOptions.body === 'object' &&
    !(fetchOptions.body instanceof FormData)
  ) {
    fetchOptions.body = JSON.stringify(fetchOptions.body);
  }

  const res = await fetch(`${API_BASE}${path}`, fetchOptions);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return data;
}

async function checkAuth() {
  try {
    return await apiRequest('/api/admin/me');
  } catch {
    return null;
  }
}

async function requireAuth() {
  const admin = await checkAuth();
  if (!admin) {
    window.location.href = '/admin/login.html';
    return null;
  }
  return admin;
}

async function logout() {
  try {
    await apiRequest('/api/admin/logout', { method: 'POST' });
  } catch {
    /* ignore */
  }
  // No localStorage to clear anymore
  window.location.href = '/admin/login.html';
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function showAlert(container, message, type = 'error') {
  container.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
}

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleString();
}
