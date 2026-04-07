// ── API base URL ────────────────────────────────────────────
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:8000'
  : 'https://placementcoach-api.onrender.com';

// ── Token helpers ─────────────────────────────────────────
export function getToken()        { return localStorage.getItem('pc_token'); }
export function setToken(t)       { localStorage.setItem('pc_token', t); }
export function removeToken()     { localStorage.removeItem('pc_token'); localStorage.removeItem('pc_user'); }
export function getUser()         { return JSON.parse(localStorage.getItem('pc_user') || 'null'); }
export function setUser(u)        { localStorage.setItem('pc_user', JSON.stringify(u)); }
export function isLoggedIn()      { return !!getToken(); }

// ── Core fetch wrapper ────────────────────────────────────
async function request(method, path, body = null, isMultipart = false) {
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isMultipart) headers['Content-Type'] = 'application/json';

  const config = { method, headers };
  if (body) config.body = isMultipart ? body : JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, config);

  if (res.status === 401) {
    removeToken();
    window.location.href = '/login.html';
    return;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `Request failed: ${res.status}`);
  return data;
}

// ── Auth ──────────────────────────────────────────────────
export const api = {
  register: (email, password, full_name) =>
    request('POST', '/auth/register', { email, password, full_name }),

  login: (email, password) =>
    request('POST', '/auth/login', { email, password }),

  // Resume
  uploadResume: (formData) =>
    request('POST', '/resume/upload', formData, true),

  // Analysis
  analyzeProfile: (payload) =>
    request('POST', '/analysis/analyze-profile', payload),

  generatePlan: (analysis_id) =>
    request('POST', '/analysis/generate-plan', { analysis_id }),

  // Dashboard
  getResults: () =>
    request('GET', '/me/results'),

  getProfile: () =>
    request('GET', '/me/profile'),

  getHistory: () =>
    request('GET', '/analysis/history'),
};
