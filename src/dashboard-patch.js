const DASHBOARD_SERVER_URL = 'http://natsumidashboard.kro.kr:25901';
const isLocalPreview = ['localhost', '127.0.0.1', '::1'].includes(location.hostname);
const API_BASE = (import.meta.env?.VITE_API_BASE_URL || (isLocalPreview ? window.location.origin : DASHBOARD_SERVER_URL)).replace(/\/$/, '');

const originalFetch = window.fetch.bind(window);
const selectedBotKey = 'natsumi-dashboard-selected-bot';
const premiumTabs = new Set(['settings', 'welcome', 'commands', 'tts', 'emoji', 'moderation']);
const defaultHeartUrls = {
  natsumi: 'https://koreanbots.dev/bots/905355491708903485',
  yuzuha: 'https://koreanbots.dev/bots/1508101246723035196',
};
const heartCache = {
  natsumi: { verified: false, heartUrl: defaultHeartUrls.natsumi, checked: false },
  yuzuha: { verified: false, heartUrl: defaultHeartUrls.yuzuha, checked: false },
};

let renderQueued = false;
let checkingHeart = false;

function botKeyFromValue(value) {
  return value === 'yuzuha' ? 'yuzuha' : 'natsumi';
}

function currentBotKey() {
  const selectValue = document.querySelector('#botSelect')?.value;
  const urlValue = new URLSearchParams(window.location.search).get('bot');
  return botKeyFromValue(selectValue || urlValue || localStorage.getItem(selectedBotKey) || 'natsumi');
}

function currentActiveTab() {
  return document.querySelector('.menu-tile.active')?.dataset?.tab
    || new URLSearchParams(window.location.search).get('tab')
    || 'notice';
}

function isHeartStatusRequest(input) {
  const raw = typeof input === 'string' ? input : input?.url || '';
  try {
    return new URL(raw, window.location.href).pathname.endsWith('/api/heart-status');
  } catch {
    return String(raw).includes('/api/heart-status');
  }
}

function botKeyFromRequest(input) {
  const raw = typeof input === 'string' ? input : input?.url || '';
  try {
    const url = new URL(raw, window.location.href);
    return botKeyFromValue(url.searchParams.get('bot') || currentBotKey());
  } catch {
    return currentBotKey();
  }
}

function normalizeHeartStatus(data = {}, fallbackBot = currentBotKey()) {
  const botKey = botKeyFromValue(data.botKey || fallbackBot);
  return {
    ...data,
    botKey,
    verified: Boolean(data.verified),
    heartUrl: data.heartUrl || defaultHeartUrls[botKey],
    checked: true,
  };
}

window.fetch = async (input, init) => {
  const response = await originalFetch(input, init);
  if (!isHeartStatusRequest(input)) return response;

  const botKey = botKeyFromRequest(input);
  const data = response.ok ? await response.clone().json().catch(() => ({})) : {};
  heartCache[botKey] = normalizeHeartStatus(data, botKey);

  return new Response(JSON.stringify(heartCache[botKey]), {
    status: response.status,
    statusText: response.statusText,
    headers: { 'Content-Type': 'application/json' },
  });
};

async function fetchHeartStatus(botKey = currentBotKey(), force = false) {
  const key = botKeyFromValue(botKey);
  if (!force && heartCache[key]?.checked) return heartCache[key];
  checkingHeart = true;
  try {
    const response = await originalFetch(`${API_BASE}/api/heart-status?bot=${encodeURIComponent(key)}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = response.ok ? await response.json().catch(() => ({})) : {};
    heartCache[key] = normalizeHeartStatus(data, key);
  } catch {
    heartCache[key] = { ...heartCache[key], botKey: key, verified: false, checked: true };
  } finally {
    checkingHeart = false;
  }
  return heartCache[key];
}

function injectPatchStyle() {
  if (document.getElementById('dashboard-patch-style')) return;
  const style = document.createElement('style');
  style.id = 'dashboard-patch-style';
  style.textContent = `
    .logout-btn { white-space: nowrap; }
    .heart-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border-radius: 999px;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 800;
      background: rgba(255,255,255,.55);
      border: 1px solid rgba(255,255,255,.35);
    }
    .heart-status-badge.ok { color: #e7497d; }
    .heart-status-badge.locked { color: #8b5a00; }
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

function renderHeartLock(botKey, status) {
  const botName = botKey === 'yuzuha' ? '유즈하' : '나츠미';
  return `
    <section class="tool-card heart-lock">
      <h3>${botName} 한디리 하트 인증이 필요해요</h3>
      <p>${botName} 설정은 선택한 봇 기준으로 한디리 하트를 눌렀는지 확인한 뒤 사용할 수 있어요. 봇을 바꾸면 하트 인증도 봇별로 다시 확인해요.</p>
      <div class="form-actions">
        <a class="primary-btn" href="${status.heartUrl || defaultHeartUrls[botKey]}" target="_blank" rel="noreferrer">${botName} 하트 누르기</a>
        <button class="soft-btn" data-dashboard-patch-action="refresh-heart" type="button">하트 다시 확인</button>
      </div>
    </section>
  `;
}

function syncHeartBadge() {
  const topActions = document.querySelector('.top-actions');
  const loginPill = topActions?.querySelector('.login-pill');
  if (!topActions || !loginPill) return;

  const botKey = currentBotKey();
  const status = heartCache[botKey];
  let badge = topActions.querySelector('[data-dashboard-patch-heart-badge]');
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'heart-status-badge';
    badge.dataset.dashboardPatchHeartBadge = '1';
    topActions.insertBefore(badge, loginPill);
  }
  badge.className = `heart-status-badge ${status?.verified ? 'ok' : 'locked'}`;
  badge.textContent = `${botKey === 'yuzuha' ? '유즈하' : '나츠미'} 하트 ${status?.verified ? '인증됨' : '미인증'}`;
}

async function syncHeartLock(force = false) {
  const botKey = currentBotKey();
  const tab = currentActiveTab();
  if (!premiumTabs.has(tab)) {
    syncHeartBadge();
    return;
  }

  const panel = document.querySelector('#panel');
  if (!panel || checkingHeart) return;

  const status = await fetchHeartStatus(botKey, force);
  syncHeartBadge();
  if (status.verified) return;

  const alreadyLocked = panel.querySelector('.heart-lock');
  if (!alreadyLocked) panel.innerHTML = renderHeartLock(botKey, status);
}

function queueSyncHeartLock(force = false) {
  if (renderQueued) return;
  renderQueued = true;
  window.setTimeout(() => {
    renderQueued = false;
    syncLogoutButton();
    syncHeartLock(force);
  }, 0);
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

document.addEventListener('click', async (event) => {
  const logoutButton = event.target.closest('[data-dashboard-patch-action="logout"]');
  if (logoutButton) {
    event.preventDefault();
    event.stopPropagation();
    logout();
    return;
  }

  const refreshHeartButton = event.target.closest('[data-dashboard-patch-action="refresh-heart"]');
  if (refreshHeartButton) {
    event.preventDefault();
    event.stopPropagation();
    await syncHeartLock(true);
    return;
  }

  const normalRefreshHeart = event.target.closest('[data-action="refresh-heart"]');
  if (normalRefreshHeart) {
    window.setTimeout(() => queueSyncHeartLock(true), 0);
    return;
  }

  const saveButton = event.target.closest('[data-action^="save-"], [data-action="test-welcome"]');
  if (saveButton && premiumTabs.has(currentActiveTab())) {
    const status = await fetchHeartStatus(currentBotKey(), true);
    if (!status.verified) {
      event.preventDefault();
      event.stopPropagation();
      document.querySelector('#panel').innerHTML = renderHeartLock(currentBotKey(), status);
    }
  }
}, true);

document.addEventListener('change', (event) => {
  if (event.target?.id === 'botSelect') window.setTimeout(() => queueSyncHeartLock(true), 0);
}, true);

injectPatchStyle();
queueSyncHeartLock(true);
new MutationObserver(() => queueSyncHeartLock()).observe(document.documentElement, { childList: true, subtree: true });
