// ── Toast notifications ───────────────────────────────────
export function showToast(msg, type = 'info', duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; }, duration);
  setTimeout(() => toast.remove(), duration + 300);
}

// ── Loading state on a button ─────────────────────────────
export function setLoading(btn, loading, label = 'Loading...') {
  if (loading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner"></span>${label}`;
    btn.disabled = true;
  } else {
    btn.innerHTML = btn.dataset.originalText || label;
    btn.disabled = false;
  }
}

// ── Score → color mapping ─────────────────────────────────
export function scoreColor(score) {
  if (score >= 70) return 'var(--success)';
  if (score >= 45) return 'var(--warning)';
  return 'var(--danger)';
}

export function labelColor(label) {
  const map = { Strong: 'success', Good: 'success', Moderate: 'warning', Low: 'danger' };
  return map[label] || 'accent';
}

// ── Skill tag renderer ────────────────────────────────────
export function renderSkillTag(skill, onRemove) {
  const tag = document.createElement('span');
  tag.className = 'skill-tag selected';
  tag.innerHTML = `${skill} <span class="remove" data-skill="${skill}">×</span>`;
  tag.querySelector('.remove').addEventListener('click', () => {
    tag.remove();
    onRemove(skill);
  });
  return tag;
}

// ── Score ring SVG ────────────────────────────────────────
export function buildScoreRing(score, label, color) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const filled = circ * (score / 100);
  return `
    <div class="score-ring">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r="${r}" fill="none"
          stroke="rgba(255,255,255,0.06)" stroke-width="8"/>
        <circle cx="70" cy="70" r="${r}" fill="none"
          stroke="${color}" stroke-width="10"
          stroke-dasharray="${filled} ${circ}"
          stroke-linecap="round"
          style="filter: drop-shadow(0 0 8px ${color});"/>
      </svg>
      <div class="score-val">
        <span class="score-num" style="color:${color}">${score}</span>
        <span class="score-lbl">${label}</span>
      </div>
    </div>`;
}

// ── Redirect if not logged in ─────────────────────────────
export function requireAuth() {
  if (!localStorage.getItem('pc_token')) {
    window.location.href = '/login.html';
  }
}

// ── Store analysis state across pages ────────────────────
export const state = {
  set: (key, val) => localStorage.setItem(`pc_${key}`, JSON.stringify(val)),
  get: (key)       => JSON.parse(localStorage.getItem(`pc_${key}`) || 'null'),
  clear: (key)     => localStorage.removeItem(`pc_${key}`),
};
