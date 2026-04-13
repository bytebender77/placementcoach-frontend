/**
 * api.js — Updated with billing endpoints + 402 quota handler
 *
 * Key addition: the request() wrapper now handles HTTP 402 (Payment Required)
 * by showing the quota modal automatically. This means any route that returns
 * 402 will show the upgrade prompt without any extra code in the caller.
 */

import { showQuotaModal } from './usage_meter.js';

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:8000'
  : 'https://placementcoach-api.onrender.com';

export function getToken()   { return localStorage.getItem('pc_token'); }
export function setToken(t)  { localStorage.setItem('pc_token', t); }
export function removeToken(){ localStorage.removeItem('pc_token'); localStorage.removeItem('pc_user'); }
export function getUser()    { return JSON.parse(localStorage.getItem('pc_user') || 'null'); }
export function setUser(u)   { localStorage.setItem('pc_user', JSON.stringify(u)); }
export function isLoggedIn() { return !!getToken(); }

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
    window.location.href = '/src/login.html';
    return;
  }

  // ── 402 Payment Required → show upgrade modal ──────────────────────────
  if (res.status === 402) {
    const data = await res.json().catch(() => ({}));
    const detail = typeof data.detail === 'object' ? data.detail : {};
    showQuotaModal(detail);
    throw new Error(detail.message || 'Upgrade required');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `Request failed: ${res.status}`);
  return data;
}

export const api = {
  // Auth
  register: (email, password, full_name) =>
    request('POST', '/auth/register', { email, password, full_name }),
  login: (email, password) =>
    request('POST', '/auth/login', { email, password }),

  // Resume
  uploadResume: (formData) =>
    request('POST', '/resume/upload', formData, true),

  // Analysis (quota-gated on backend — 402 auto-shows modal)
  analyzeProfile: (payload) =>
    request('POST', '/analysis/analyze-profile', payload),
  generatePlan: (analysis_id) =>
    request('POST', '/analysis/generate-plan', { analysis_id }),
  getHistory: () =>
    request('GET', '/analysis/history'),

  // Dashboard
  getResults: () =>
    request('GET', '/me/results'),
  getProfile: () =>
    request('GET', '/me/profile'),

  // Opportunities (feature-gated — 402 auto-shows modal)
  findOpportunities: (analysis_id, placement_label) =>
    request('POST', '/analysis/find-opportunities', { analysis_id, placement_label }),
  getOpportunities: () =>
    request('GET', '/opportunities/my'),
  saveOpportunity: (opportunity_id) =>
    request('POST', `/opportunities/save/${opportunity_id}`),
  markApplied: (opportunity_id) =>
    request('POST', `/opportunities/applied/${opportunity_id}`),

  // Career path (feature-gated)
  generateCareerPath: (analysis_id) =>
    request('POST', '/analysis/career-path', { analysis_id }),
  getCareerPath: () =>
    request('GET', '/opportunities/career-path/latest'),

  // ── Billing ────────────────────────────────────────────────────────────
  getPlans: () =>
    request('GET', '/billing/plans'),
  getMySubscription: () =>
    request('GET', '/billing/my-subscription'),
  getUsageStatus: () =>
    request('GET', '/billing/usage'),
  createOrder: (plan_id) =>
    request('POST', '/billing/create-order', { plan_id }),
  verifyPayment: (payload) =>
    request('POST', '/billing/verify-payment', payload),
  cancelSubscription: () =>
    request('POST', '/billing/cancel'),
  getPaymentHistory: () =>
    request('GET', '/billing/history'),
};
