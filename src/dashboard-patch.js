const DASHBOARD_SERVER_URL = 'https://natsumidashboard.kro.kr';
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
const emojiChannelCache = new Map();

let renderQueued = false;
let checkingHeart = false;
let bypassPremiumTabClick = false;
let pendingPremiumTab = null;

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

function selectedGuildId() {
  return document.querySelector('#guildSelect')?.value || localStorage.getItem('natsumi-dashboard-selected-guild') || 'preview';
}

function esc(value = '') {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function apiUrl(path) {
  const sep = path.includes('?') ? '&' : '?';
  return `${API_BASE}${path}${sep}bot=${encodeURIComponent(currentBotKey())}`;
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
    const response = await originalFetch(`${API_BASE}/api/heart-status?bot=${encodeURIComponent(key)}&refresh=${Date.now()}`, {
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
      display: inline-flex; align-items: center; gap: 6px; border-radius: 999px;
      padding: 8px 12px; font-size: 12px; font-weight: 800;
      background: rgba(255,255,255,.55); border: 1px solid rgba(255,255,255,.35);
    }
    .heart-status-badge.ok { color: #e7497d; }
    .heart-status-badge.locked { color: #8b5a00; }
    .menu-tile[data-heart-locked="1"]::after { content: ' 🔒'; opacity: .8; }
    .emoji-channel-panel { margin-top: 18px; }
    .emoji-channel-tools {
      display: grid; grid-template-columns: minmax(180px, 1fr) auto auto; gap: 10px; align-items: end; margin-top: 12px;
    }
    .emoji-channel-list { display: grid; gap: 10px; margin-top: 12px; }
    .emoji-channel-row {
      display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 12px;
      padding: 12px 14px; border-radius: 16px; background: rgba(255,255,255,.45);
      border: 1px solid rgba(255,255,255,.35);
    }
    .emoji-channel-row.off { background: rgba(255, 110, 150, .16); border-color: rgba(255, 80, 130, .35); }
    .emoji-channel-row b { display:block; }
    .emoji-channel-row small { opacity:.72; }
    .emoji-channel-actions { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
    .emoji-channel-state { font-size: 12px; font-weight: 800; opacity: .8; }
    @media (max-width: 720px) { .emoji-channel-tools { grid-template-columns: 1fr; } }
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

function syncLockedMenuMarks() {
  const status = heartCache[currentBotKey()];
  document.querySelectorAll('.menu-tile[data-tab]').forEach((button) => {
    const locked = premiumTabs.has(button.dataset.tab) && !status?.verified;
    if (locked) button.dataset.heartLocked = '1';
    else delete button.dataset.heartLocked;
  });
}

function renderHeartLock(botKey, status, tab = pendingPremiumTab || currentActiveTab()) {
  const botName = botKey === 'yuzuha' ? '유즈하' : '나츠미';
  const safeTab = premiumTabs.has(tab) ? tab : 'settings';
  return `
    <section class="tool-card heart-lock" data-pending-tab="${safeTab}">
      <h3>${botName} 한디리 하트 인증이 필요해요</h3>
      <p>${botName} 설정은 하트 인증 전에는 열 수 없어요. 아래 버튼으로 하트를 누른 뒤 다시 확인하면 방금 열려던 설정 메뉴가 자동으로 열려요.</p>
      <div class="form-actions">
        <a class="primary-btn" href="${status.heartUrl || defaultHeartUrls[botKey]}" target="_blank" rel="noreferrer">${botName} 하트 누르기</a>
        <button class="soft-btn" data-dashboard-patch-action="refresh-heart" type="button">하트 다시 확인</button>
      </div>
    </section>
  `;
}

function showHeartLock(botKey = currentBotKey(), status = heartCache[botKey], tab = pendingPremiumTab || currentActiveTab()) {
  if (premiumTabs.has(tab)) pendingPremiumTab = tab;
  const panel = document.querySelector('#panel');
  if (panel) panel.innerHTML = renderHeartLock(botKey, status || heartCache[botKey], pendingPremiumTab);
  syncHeartBadge();
  syncLockedMenuMarks();
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

function findMenuButton(tab) {
  return [...document.querySelectorAll('.menu-tile[data-tab]')].find((button) => button.dataset.tab === tab) || null;
}

function openPremiumTabByName(tab = pendingPremiumTab) {
  const safeTab = premiumTabs.has(tab) ? tab : 'settings';
  const button = findMenuButton(safeTab);
  if (!button) return false;

  const message = document.querySelector('.heart-lock p');
  if (message) message.textContent = '하트 인증이 확인됐어. 설정 화면을 여는 중이야.';

  bypassPremiumTabClick = true;
  button.click();

  const retryOpen = () => {
    if (!document.querySelector('.heart-lock')) return;
    const retryButton = findMenuButton(safeTab);
    if (retryButton) retryButton.click();
  };

  window.setTimeout(retryOpen, 150);
  window.setTimeout(retryOpen, 450);

  window.setTimeout(() => {
    bypassPremiumTabClick = false;
    if (!document.querySelector('.heart-lock')) pendingPremiumTab = null;
    queueSyncHeartLock(false);
  }, 800);

  return true;
}

async function syncHeartLock(force = false) {
  const botKey = currentBotKey();
  const tab = currentActiveTab();
  if (!premiumTabs.has(tab)) {
    syncHeartBadge();
    syncLockedMenuMarks();
    return;
  }

  const panel = document.querySelector('#panel');
  if (!panel || checkingHeart) return;

  const status = await fetchHeartStatus(botKey, force);
  syncHeartBadge();
  syncLockedMenuMarks();
  if (status.verified) {
    if (panel.querySelector('.heart-lock') && pendingPremiumTab) openPremiumTabByName(pendingPremiumTab);
    return;
  }

  const alreadyLocked = panel.querySelector('.heart-lock');
  if (!alreadyLocked) showHeartLock(botKey, status, tab);
}

function queueSyncHeartLock(force = false) {
  if (renderQueued) return;
  renderQueued = true;
  window.setTimeout(() => {
    renderQueued = false;
    syncLogoutButton();
    injectEmojiChannelPanel();
    syncHeartLock(force);
  }, 0);
}

async function openPremiumTabAfterHeartCheck(button) {
  const targetTab = button.dataset.tab;
  pendingPremiumTab = targetTab;
  const botKey = currentBotKey();
  const status = await fetchHeartStatus(botKey, true);
  syncHeartBadge();
  syncLockedMenuMarks();

  if (!status.verified) {
    showHeartLock(botKey, status, targetTab);
    return;
  }

  openPremiumTabByName(targetTab);
}

async function logout() {
  try {
    await originalFetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' } });
  } catch {}
  window.location.href = window.location.pathname;
}

async function loadEmojiChannelSettings(guildId = selectedGuildId(), force = false) {
  const key = `${currentBotKey()}:${guildId}`;
  if (!force && emojiChannelCache.has(key)) return emojiChannelCache.get(key);
  try {
    const res = await originalFetch(`${apiUrl(`/api/dashboard/guilds/${guildId}/emoji-upscale/channels`)}&refresh=${Date.now()}`, { credentials: 'include' });
    const data = res.ok ? await res.json() : { channels: [] };
    const payload = { ...data, channels: data.channels || [] };
    emojiChannelCache.set(key, payload);
  } catch {
    emojiChannelCache.set(key, { channels: [] });
  }
  return emojiChannelCache.get(key);
}

function channelRowsFromDom() {
  return [...document.querySelectorAll('#emojiChannelSettings [data-channel-id]')].map((row) => ({
    channelId: row.dataset.channelId,
    enabled: row.querySelector('input[type="checkbox"]')?.checked !== false,
    webhookName: document.querySelector('#emojiWebhookName')?.value?.trim() || 'Natsumi Emoji Upscaler',
  }));
}

async function saveEmojiChannelSettings() {
  const guildId = selectedGuildId();
  const rows = channelRowsFromDom();
  const globalEnabled = document.querySelector('#emojiEnabled')?.checked === true;
  const webhookName = document.querySelector('#emojiWebhookName')?.value?.trim() || 'Natsumi Emoji Upscaler';
  const res = await originalFetch(apiUrl(`/api/dashboard/guilds/${guildId}/emoji-upscale/channels`), {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ replace: true, globalEnabled, webhookName, channels: rows }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  emojiChannelCache.set(`${currentBotKey()}:${guildId}`, { ...data, channels: data.channels || rows });
}

function allTextChannelsFromDom() {
  const options = [...document.querySelectorAll('#emojiChannel option, #noticeChannel option, #ttsText option, #moderationLogChannel option')];
  const seen = new Set();
  return options
    .map((option) => ({ id: option.value, name: option.textContent.replace(/^#\s*/, '').trim() }))
    .filter((channel) => /^\d{15,25}$/.test(channel.id) && !seen.has(channel.id) && seen.add(channel.id));
}

function refreshEmojiChannelVisualState() {
  document.querySelectorAll('#emojiChannelSettings [data-channel-id]').forEach((row) => {
    const checkbox = row.querySelector('input[type="checkbox"]');
    const state = row.querySelector('.emoji-channel-state');
    const on = checkbox?.checked !== false;
    row.classList.toggle('off', !on);
    if (state) state.textContent = on ? 'ON' : 'OFF';
  });
}

function addEmojiDisabledChannel(channelId) {
  const row = document.querySelector(`#emojiChannelSettings [data-channel-id="${CSS.escape(channelId)}"]`);
  if (!row) return false;
  const checkbox = row.querySelector('input[type="checkbox"]');
  if (checkbox) checkbox.checked = false;
  refreshEmojiChannelVisualState();
  row.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  return true;
}

function setAllEmojiChannels(enabled) {
  document.querySelectorAll('#emojiChannelSettings [data-channel-id] input[type="checkbox"]').forEach((checkbox) => {
    checkbox.checked = enabled;
  });
  refreshEmojiChannelVisualState();
}

async function injectEmojiChannelPanel() {
  if (currentActiveTab() !== 'emoji') return;
  const panel = document.querySelector('#panel');
  if (!panel || panel.querySelector('#emojiChannelSettings')) return;
  const textChannels = allTextChannelsFromDom();
  const data = await loadEmojiChannelSettings(selectedGuildId(), true);
  const settings = data.channels || [];
  const map = new Map(settings.map((row) => [row.channelId, row]));
  const html = `
    <section class="tool-card emoji-channel-panel" id="emojiChannelSettings">
      <div class="split-head">
        <div>
          <h4>채널별 이모지 업스케일</h4>
          <p>원하는 채팅 채널을 골라 OFF 목록에 추가할 수 있어요. 저장하면 봇이 MongoDB 설정을 바로 읽어요.</p>
        </div>
        <button class="soft-btn" data-dashboard-patch-action="refresh-emoji-channels" type="button">새로고침</button>
      </div>
      <div class="emoji-channel-tools">
        <label>꺼놓을 채팅 채널 선택
          <select id="emojiDisablePicker">
            <option value="">채널 선택</option>
            ${textChannels.map((channel) => `<option value="${esc(channel.id)}"># ${esc(channel.name)}</option>`).join('')}
          </select>
        </label>
        <button class="soft-btn" data-dashboard-patch-action="add-disabled-emoji-channel" type="button">선택 채널 끄기</button>
        <button class="soft-btn" data-dashboard-patch-action="enable-all-emoji-channels" type="button">전체 채널 켜기</button>
      </div>
      <div class="emoji-channel-list">
        ${textChannels.map((channel) => {
          const row = map.get(channel.id);
          const checked = row?.enabled !== false;
          return `
            <label class="emoji-channel-row ${checked ? '' : 'off'}" data-channel-id="${esc(channel.id)}">
              <span><b># ${esc(channel.name)}</b><small>${esc(channel.id)}</small></span>
              <span class="emoji-channel-actions"><span class="emoji-channel-state">${checked ? 'ON' : 'OFF'}</span><input type="checkbox" ${checked ? 'checked' : ''}></span>
            </label>
          `;
        }).join('') || '<p>표시할 텍스트 채널이 없어요.</p>'}
      </div>
      <div class="form-actions"><button class="primary-btn" data-dashboard-patch-action="save-emoji-channels" type="button">채널별 설정 저장</button></div>
    </section>
  `;
  panel.insertAdjacentHTML('beforeend', html);
  refreshEmojiChannelVisualState();
}

document.addEventListener('click', async (event) => {
  const addDisabled = event.target.closest('[data-dashboard-patch-action="add-disabled-emoji-channel"]');
  if (addDisabled) {
    event.preventDefault();
    event.stopPropagation();
    const picker = document.querySelector('#emojiDisablePicker');
    if (picker?.value) addEmojiDisabledChannel(picker.value);
    return;
  }

  const enableAll = event.target.closest('[data-dashboard-patch-action="enable-all-emoji-channels"]');
  if (enableAll) {
    event.preventDefault();
    event.stopPropagation();
    setAllEmojiChannels(true);
    return;
  }

  const refreshEmoji = event.target.closest('[data-dashboard-patch-action="refresh-emoji-channels"]');
  if (refreshEmoji) {
    event.preventDefault();
    event.stopPropagation();
    document.querySelector('#emojiChannelSettings')?.remove();
    emojiChannelCache.delete(`${currentBotKey()}:${selectedGuildId()}`);
    await injectEmojiChannelPanel();
    return;
  }

  const saveEmojiChannels = event.target.closest('[data-dashboard-patch-action="save-emoji-channels"]');
  if (saveEmojiChannels) {
    event.preventDefault();
    event.stopPropagation();
    try {
      await saveEmojiChannelSettings();
      saveEmojiChannels.textContent = '저장 완료';
      setTimeout(() => { saveEmojiChannels.textContent = '채널별 설정 저장'; }, 1200);
    } catch {
      saveEmojiChannels.textContent = '저장 실패';
      setTimeout(() => { saveEmojiChannels.textContent = '채널별 설정 저장'; }, 1200);
    }
    return;
  }

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
    const lockedTab = document.querySelector('.heart-lock')?.dataset?.pendingTab;
    if (premiumTabs.has(lockedTab)) pendingPremiumTab = lockedTab;
    const botKey = currentBotKey();
    const status = await fetchHeartStatus(botKey, true);
    syncHeartBadge();
    syncLockedMenuMarks();
    if (status?.verified) openPremiumTabByName(pendingPremiumTab || lockedTab || 'settings');
    else showHeartLock(botKey, status, pendingPremiumTab || lockedTab || 'settings');
    return;
  }

  const tabButton = event.target.closest('.menu-tile[data-tab]');
  if (tabButton && premiumTabs.has(tabButton.dataset.tab) && !bypassPremiumTabClick) {
    event.preventDefault();
    event.stopPropagation();
    await openPremiumTabAfterHeartCheck(tabButton);
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
      showHeartLock(currentBotKey(), status, currentActiveTab());
    }
  }
}, true);

document.addEventListener('change', (event) => {
  if (event.target.closest?.('#emojiChannelSettings')) refreshEmojiChannelVisualState();
  if (event.target?.id === 'botSelect') window.setTimeout(() => {
    emojiChannelCache.clear();
    queueSyncHeartLock(true);
  }, 0);
  if (event.target?.id === 'guildSelect') window.setTimeout(() => {
    emojiChannelCache.clear();
    queueSyncHeartLock(true);
  }, 0);
}, true);

injectPatchStyle();
queueSyncHeartLock(true);
new MutationObserver(() => queueSyncHeartLock()).observe(document.documentElement, { childList: true, subtree: true });
