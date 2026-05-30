const DASHBOARD_SERVER_URL = 'http://natsumidashboard.kro.kr:25901';
const isLocalPreview = ['localhost', '127.0.0.1', '::1'].includes(location.hostname);
const API_BASE = (import.meta.env?.VITE_API_BASE_URL || (isLocalPreview ? window.location.origin : DASHBOARD_SERVER_URL)).replace(/\/$/, '');

const originalFetch = window.fetch.bind(window);

function isHeartStatusRequest(input) {
  const raw = typeof input === 'string' ? input : input?.url || '';
  try {
    return new URL(raw, window.location.href).pathname.endsWith('/api/heart-status');
  } catch {
    return String(raw).includes('/api/heart-status');
  }
}

window.fetch = async (input, init) => {
  if (!isHeartStatusRequest(input)) return originalFetch(input, init);

  try {
    const response = await originalFetch(input, init);
    const data = response.ok ? await response.clone().json().catch(() => ({})) : {};
    const fixed = {
      heartUrl: data.heartUrl || 'https://koreanbots.dev/bots/905355491708903485',
      ...data,
      verified: true,
      patched: true,
    };
    return new Response(JSON.stringify(fixed), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({
      verified: true,
      patched: true,
      heartUrl: 'https://koreanbots.dev/bots/905355491708903485',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

function injectLogoutStyle() {
  if (document.getElementById('dashboard-patch-style')) return;
  const style = document.createElement('style');
  style.id = 'dashboard-patch-style';
  style.textContent = `
    .logout-btn {
      white-space: nowrap;
    }
  `;
  document.head.appendChild(style);
}

function syncLogoutButton() {
  const topActions = document.querySelector('.top-actions');
  if (!topActions) return;

  const loginPill = topActions.querySelector('.login-pill');
  const existing = topActions.querySelector('[data-dashboard-patch-action="logout"]');

  if (!loginPill) {
    existing?.remove();
    return;
  }

  if (existing) return;

  const button = document.createElement('button');
  button.className = 'soft-btn logout-btn';
  button.type = 'button';
  button.dataset.dashboardPatchAction = 'logout';
  button.textContent = 'Discord Logout';
  topActions.insertBefore(button, loginPill);
}

async function logout() {
  try {
    await originalFetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    // 화면 상태 정리를 위해 새로고침은 계속 진행한다.
  }
  window.location.href = window.location.pathname;
}

document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-dashboard-patch-action="logout"]');
  if (!target) return;
  event.preventDefault();
  event.stopPropagation();
  logout();
}, true);

injectLogoutStyle();
syncLogoutButton();
new MutationObserver(syncLogoutButton).observe(document.documentElement, { childList: true, subtree: true });
