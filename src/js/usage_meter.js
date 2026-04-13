/**
 * Usage Meter Component
 * =====================
 * Renders a compact usage bar + upgrade prompt in the dashboard nav.
 * Call mountUsageMeter() on any page that has a #usage-meter element.
 *
 * Also exports checkFeatureAccess() — call before showing premium features
 * to decide whether to render them or show an upgrade nudge.
 */

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:8000'
  : 'https://placementcoach-api.onrender.com';

function getToken() { return localStorage.getItem('pc_token'); }

async function fetchUsage() {
  const resp = await fetch(`${API_BASE}/billing/usage`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!resp.ok) return null;
  return resp.json();
}


/**
 * Mount the usage meter into an element with id="usage-meter".
 * Call this on page load for any authenticated page.
 */
export async function mountUsageMeter() {
  const container = document.getElementById('usage-meter');
  if (!container || !getToken()) return;

  try {
    const usage = await fetchUsage();
    if (!usage) return;

    const isUnlimited = usage.analyses_limit === -1;
    const pct = isUnlimited ? 100 : Math.min(100, (usage.analyses_used / usage.analyses_limit) * 100);
    const isLow = !isUnlimited && usage.analyses_remaining <= 1;
    const isOut = !isUnlimited && usage.analyses_remaining <= 0;

    const barColor = isOut ? 'var(--danger)' : isLow ? 'var(--warning)' : 'var(--accent)';
    const label = isUnlimited
      ? `${usage.plan_name} · Unlimited`
      : `${usage.analyses_used}/${usage.analyses_limit} analyses`;

    container.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px">
        <div style="display:flex;flex-direction:column;gap:3px;min-width:120px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:0.72rem;color:var(--text-3);font-weight:600;text-transform:uppercase;letter-spacing:0.06em">${usage.plan_name}</span>
            <span style="font-size:0.72rem;color:${isOut ? 'var(--danger)' : 'var(--text-3)'}">${label}</span>
          </div>
          <div style="height:4px;background:var(--bg3);border-radius:100px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${barColor};border-radius:100px;transition:width 0.4s ease"></div>
          </div>
        </div>
        ${!isUnlimited && usage.plan_id === 'free' ? `
          <a href="/src/pricing.html" style="font-size:0.72rem;font-weight:700;color:var(--accent);white-space:nowrap;border:1px solid rgba(108,99,255,0.3);padding:3px 10px;border-radius:100px;text-decoration:none;transition:all 0.15s"
             onmouseover="this.style.background='rgba(108,99,255,0.1)'" onmouseout="this.style.background='transparent'">
            Upgrade
          </a>
        ` : ''}
      </div>
      ${isOut ? `
        <div style="margin-top:8px;font-size:0.78rem;color:var(--danger);background:rgba(255,87,87,0.08);border:1px solid rgba(255,87,87,0.2);border-radius:6px;padding:8px 12px">
          Monthly limit reached. <a href="/src/pricing.html" style="color:var(--danger);font-weight:700">Upgrade for more →</a>
        </div>
      ` : isLow ? `
        <div style="margin-top:8px;font-size:0.78rem;color:var(--warning)">
          ${usage.analyses_remaining} analysis left · <a href="/src/pricing.html" style="color:var(--warning);font-weight:700">Upgrade</a>
        </div>
      ` : ''}
    `;

    // Store in window for quick access by other functions
    window.__usageCache = usage;

  } catch (e) {
    // Silently fail — usage meter is non-critical
  }
}


/**
 * Check if the user can access a feature.
 * Returns { allowed: bool, reason: string, upgrade_url: string }
 *
 * Usage:
 *   const access = await checkFeatureAccess('opportunities');
 *   if (!access.allowed) { showUpgradePrompt(access.reason); return; }
 */
export async function checkFeatureAccess(featureKey) {
  try {
    const usage = window.__usageCache || await fetchUsage();
    if (!usage) return { allowed: false, reason: 'Could not verify plan', upgrade_url: '/src/pricing.html' };

    const features = usage.features || {};
    const allowed = features[featureKey] === true;

    if (!allowed) {
      const featureNames = {
        opportunities:     'Live job & internship feed',
        career_path:       'Career path analysis',
        mock_interview:    'Mock interview prep',
        linkedin_optimizer:'LinkedIn optimizer',
        diff_view:         'Score comparison',
      };
      return {
        allowed: false,
        reason: `${featureNames[featureKey] || featureKey} requires Basic or Pro plan (₹49/mo).`,
        upgrade_url: '/src/pricing.html',
      };
    }

    return { allowed: true };
  } catch (e) {
    return { allowed: false, reason: 'Could not verify plan', upgrade_url: '/src/pricing.html' };
  }
}


/**
 * Show an inline upgrade prompt when a feature is locked.
 * Injects a card into containerId explaining what's needed.
 *
 * Usage:
 *   showUpgradePrompt('opportunities-container', 'Live job feed requires Basic plan');
 */
export function showUpgradePrompt(containerId, message) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `
    <div style="text-align:center;padding:40px 24px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius)">
      <div style="font-size:2rem;margin-bottom:16px">🔒</div>
      <div style="font-family:var(--font-head);font-size:1.1rem;font-weight:700;margin-bottom:8px">${message}</div>
      <div style="color:var(--text-2);font-size:0.9rem;margin-bottom:24px">
        Upgrade to Basic for ₹49/month — includes job feed, career paths, and 15 analyses/month.
      </div>
      <div style="display:flex;gap:12px;justify-content:center">
        <a href="/src/pricing.html" class="btn btn-primary">See plans →</a>
        <a href="/src/pricing.html#basic" class="btn btn-ghost">Upgrade to Basic · ₹49/mo</a>
      </div>
    </div>`;
}


/**
 * Show a modal upgrade nudge when the user hits the analysis limit.
 * Call this when the API returns 402 QUOTA_EXCEEDED.
 */
export function showQuotaModal(errorDetail) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;
    display:flex;align-items:center;justify-content:center;padding:24px;
  `;
  overlay.innerHTML = `
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:20px;padding:40px;max-width:440px;width:100%;text-align:center">
      <div style="font-size:2.5rem;margin-bottom:16px">📊</div>
      <div style="font-family:var(--font-head);font-size:1.4rem;font-weight:800;margin-bottom:8px">Monthly limit reached</div>
      <div style="color:var(--text-2);margin-bottom:24px;line-height:1.6;font-size:0.95rem">
        You've used all ${errorDetail?.limit || 3} analyses this month.<br>
        Upgrade to unlock 15 analyses/mo or unlimited.
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
        <div style="background:var(--bg3);border:1px solid var(--border-hi);border-radius:var(--radius);padding:16px;text-align:center">
          <div style="font-family:var(--font-head);font-size:1.5rem;font-weight:800;color:var(--accent)">₹49</div>
          <div style="font-size:0.78rem;color:var(--text-3);margin-top:4px">Basic · 15/mo</div>
          <div style="font-size:0.82rem;color:var(--text-2);margin-top:8px">Jobs + career paths</div>
        </div>
        <div style="background:var(--bg3);border:1px solid var(--border-hi);border-radius:var(--radius);padding:16px;text-align:center">
          <div style="font-family:var(--font-head);font-size:1.5rem;font-weight:800;color:var(--accent)">₹149</div>
          <div style="font-size:0.78rem;color:var(--text-3);margin-top:4px">Pro · Unlimited</div>
          <div style="font-size:0.82rem;color:var(--text-2);margin-top:8px">Everything included</div>
        </div>
      </div>
      <a href="/src/pricing.html" style="display:block;background:var(--accent);color:white;padding:14px;border-radius:var(--radius-sm);font-weight:700;text-decoration:none;margin-bottom:12px">
        Upgrade now →
      </a>
      <button onclick="this.closest('div[style]').remove()" style="background:none;border:none;color:var(--text-3);cursor:pointer;font-size:0.85rem">
        Maybe later
      </button>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}
