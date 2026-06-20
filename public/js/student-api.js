const API_BASE = '';
const TOKEN_KEY = 'studentToken';
const STUDENT_KEY = 'studentUser';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getStudent() {
  try {
    return JSON.parse(localStorage.getItem(STUDENT_KEY) || 'null');
  } catch {
    return null;
  }
}

function setSession(token, student) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(STUDENT_KEY, JSON.stringify(student));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(STUDENT_KEY);
}

async function apiRequest(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || 'Request failed');
  return data;
}

function requireStudent() {
  if (!getToken()) {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

function logoutStudent() {
  clearSession();
  window.location.href = '/login.html';
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleString();
}
