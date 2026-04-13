// ── API base URL ────────────────────────────────────────────
const API_BASE =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : 'https://placementcoach-api.onrender.com';

// ── Token helpers ─────────────────────────────────────────
export function getToken()        { return typeof window !== 'undefined' ? localStorage.getItem('pc_token') : null; }
export function setToken(t)       { if (typeof window !== 'undefined') localStorage.setItem('pc_token', t); }
export function removeToken()     { 
  if (typeof window !== 'undefined') {
    localStorage.removeItem('pc_token'); 
    localStorage.removeItem('pc_user'); 
  }
}
export function getUser()         { 
  return typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('pc_user') || 'null') : null; 
}
export function setUser(u)        { if (typeof window !== 'undefined') localStorage.setItem('pc_user', JSON.stringify(u)); }
export function isLoggedIn()      { return !!getToken(); }

// ── Core fetch wrapper with timeout & retry ───────────────
async function fetchWithRetry(url, options, retries = 2) {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 120000); // Increased to 120s timeout
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(id);
    return response;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. The operation is taking longer than expected. Please try again or check if the document is very large.');
    }
    if (retries > 0) {
      console.log(`Retrying... (${retries} left)`);
      return fetchWithRetry(url, options, retries - 1);
    }
    throw err;
  }
}

async function request(method, path, body = null, isMultipart = false) {
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isMultipart) headers['Content-Type'] = 'application/json';

  const config = { method, headers };
  if (body) config.body = isMultipart ? body : JSON.stringify(body);

  try {
    const res = await fetchWithRetry(`${API_BASE}${path}`, config);

    if (res.status === 401) {
      removeToken();
      if (typeof window !== 'undefined') window.location.href = '/login.html';
      return;
    }

    // 204 No Content (DELETE responses) — no body to parse
    if (res.status === 204) return null;

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || `Request failed: ${res.status}`);
    return data;
  } catch (err) {
    console.error('API Request Error:', err);
    throw err;
  }
}

// ── Auth & Features ───────────────────────────────────────
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

  getResultsById: (analysisId) =>
    request('GET', `/me/results/${analysisId}`),

  getHistory: () =>
    request('GET', '/analysis/history'),

  getProfile: () =>
    request('GET', '/me/profile'),

  // ── PageIndex (Reasoning API) ───────────────────────────
  pageIndex: {
    upload: (formData) => 
      request('POST', '/pageindex/upload', formData, true),
    
    chat: (document_id, query) =>
      request('POST', '/pageindex/chat', { document_id, query }),
    
    multiChat: (documents, query) =>
      request('POST', '/pageindex/chat/multi', { documents, query }),
    
    getDocuments: () =>
      request('GET', '/pageindex/documents'),
    
    getTree: (document_id) =>
      request('GET', `/pageindex/tree/${document_id}`),
      
    delete: (document_id) =>
      request('DELETE', `/pageindex/${document_id}`),
  },

  // ── V2: Opportunities ──────────────────────────────────
  findOpportunities: (analysis_id, placement_label) =>
    request('POST', '/opportunities/find', { analysis_id, placement_label }),
  getOpportunities: () =>
    request('GET', '/opportunities/my'),
  saveOpportunity: (opportunity_id) =>
    request('POST', `/opportunities/save/${opportunity_id}`),
  markApplied: (opportunity_id) =>
    request('POST', `/opportunities/applied/${opportunity_id}`),
  getSavedOpportunities: () =>
    request('GET', '/opportunities/saved'),

  // ── V2: Career Paths ───────────────────────────────────
  generateCareerPath: (analysis_id) =>
    request('POST', '/opportunities/career-path', { analysis_id }),
  getCareerPath: () =>
    request('GET', '/opportunities/career-path/latest'),
};
