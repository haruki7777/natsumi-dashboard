import './style.css';

const DASHBOARD_SERVER_URL = 'http://natsumidashboard.kro.kr:25901';
const isLocalPreview = ['localhost', '127.0.0.1', '::1'].includes(location.hostname);
const API_BASE = (import.meta.env.VITE_API_BASE_URL || (isLocalPreview ? window.location.origin : DASHBOARD_SERVER_URL)).replace(/\/$/, '');
const NATSUMI_PROFILE_IMAGE = '/natsumi-profile-03.jpg';
const themeKey = 'natsumi-dashboard-theme';
const selectedGuildKey = 'natsumi-dashboard-selected-guild';
const selectedBotKey = 'natsumi-dashboard-selected-bot';
const app = document.getElementById('app');
const initialParams = new URLSearchParams(window.location.search);

const commandList = [
  ['도움말', '기본 안내와 링크를 보여줘요.', 'general'],
  ['핑', '봇 지연시간을 확인해요.', 'general'],
  ['진단', '봇 상태와 연결을 확인해요.', 'general'],
  ['랭크', '레벨과 랭크카드를 보여줘요.', 'general'],
  ['서버정보', '서버 정보를 확인해요.', 'general'],
  ['유저정보', '유저 정보와 배너를 확인해요.', 'general'],
  ['문의', '개발자에게 문의를 보내요.', 'util'],
  ['이모지스틸', '이모지를 서버에 가져와요.', 'util'],
  ['청소', '메시지를 정리해요.', 'mod'],
  ['공지', '서버 공지를 보내요.', 'mod'],
  ['금지어', '금지어를 관리해요.', 'mod'],
  ['티켓설정', '티켓 시스템을 설정해요.', 'ticket', true],
  ['sfw', '안전한 이미지 메뉴를 열어요.', 'image', true],
  ['애니짤', '애니 이미지 메뉴를 열어요.', 'image', true],
  ['nsfw', 'NSFW 이미지 메뉴를 열어요.', 'image', true],
  ['nsfw2', 'NSFW 이미지 메뉴 2를 열어요.', 'image', true],
  ['nsfw3', 'NSFW 이미지 메뉴 3을 열어요.', 'image', true],
  ['ai채팅', 'AI 채팅 기능을 사용해요.', 'ai'],
  ['애니굿즈뽑기', '애니 굿즈 뽑기를 해요.', 'game'],
  ['가방', '수집 가방을 확인해요.', 'game'],
  ['두더지', '두더지 속도전을 플레이해요.', 'game'],
  ['낚시', '낚시 게임을 플레이해요.', 'game'],
  ['슬롯', '슬롯 게임을 플레이해요.', 'game'],
].map(([name, description, group, heart]) => ({ name, description, group, heart }));

const voiceList = [
  ['edge_ko_sunhi', '한국어 여성 - 선히'],
  ['edge_ko_jimin', '한국어 여성 - 지민'],
  ['edge_ko_seohyeon', '한국어 여성 - 서현'],
  ['edge_ko_yujin', '한국어 여성 - 유진'],
  ['edge_ko_soonbok', '한국어 여성 - 순복'],
  ['edge_ko_injoon', '한국어 남성 - 인준'],
  ['edge_ko_bongjin', '한국어 남성 - 봉진'],
  ['edge_ko_gookmin', '한국어 남성 - 국민'],
  ['edge_ja_nanami', '일본어 여성 - 나나미'],
  ['edge_ja_aoi', '일본어 여성 - 아오이'],
  ['edge_ja_mayu', '일본어 여성 - 마유'],
  ['edge_ja_shiori', '일본어 여성 - 시오리'],
  ['edge_ja_keita', '일본어 남성 - 케이타'],
  ['edge_ja_daichi', '일본어 남성 - 다이치'],
  ['edge_ja_naoki', '일본어 남성 - 나오키'],
  ['edge_ja_masaru', '일본어 남성 - 마사루'],
  ['fish_voice_1', 'Fish Audio - 한국어 캐릭터 1'],
  ['fish_voice_2', 'Fish Audio - 한국어 캐릭터 2'],
  ['fish_voice_3', 'Fish Audio - 한국어 캐릭터 3'],
  ['fish_voice_4', 'Fish Audio - 한국어 캐릭터 4'],
  ['fish_voice_5', 'Fish Audio - 한국어 캐릭터 5'],
  ['fish_voice_6', 'Fish Audio - 일본어 애니 1'],
  ['fish_voice_7', 'Fish Audio - 일본어 애니 2'],
  ['fish_voice_8', 'Fish Audio - 일본어 애니 3'],
  ['fish_voice_9', 'Fish Audio - 일본어 애니 4'],
  ['fish_voice_10', 'Fish Audio - 일본어 애니 5'],
  ['melotts_kr_default', 'MeloTTS 보조 - 한국어 기본'],
  ['melotts_kr_soft', 'MeloTTS 보조 - 한국어 부드러운 톤'],
  ['melotts_jp_default', 'MeloTTS 보조 - 일본어 기본'],
  ['melotts_jp_soft', 'MeloTTS 보조 - 일본어 부드러운 톤'],
  ['google_ko', 'Google 보조 - 한국어'],
  ['google_ja', 'Google 보조 - 일본어'],
];
const voiceValues = new Set(voiceList.map(([value]) => value));
const normalizeVoice = (value) => voiceValues.has(value) ? value : 'edge_ko_sunhi';

const welcomeVariables = [
  '{user}', '{user.name}', '{user.tag}', '{user.id}', '{user.mention}',
  '{server}', '{server.name}', '{server.id}', '{server.count}', '{member.count}',
  '{account.created}', '{joined.at}', '{owner.id}', '{random.welcome}',
];

const sampleTemplates = [
  ['첫 인사', '{user.mention} 어서 와! {server.name}에 와줘서 고마워.'],
  ['랭크 카드', '환영해, {user.name}! 프로필 카드를 곧 준비해줄게.'],
  ['관리 안내', '{user.mention} 님이 입장했어요. 규칙을 확인하고 즐겁게 지내주세요.'],
  ['친근한 말투', '{random.welcome} {user.name}! 기다리고 있었어.'],
  ['AI 프롬프트', '새 멤버 {user.name}에게 귀엽고 밝은 유즈하식 환영 인사를 만들어줘.'],
  ['게임센터', 'PRESS START, {user.name}! {server.name} 모험이 시작됐어.'],
  ['차분한 안내', '{user.mention} 님, 환영합니다. 필요한 안내는 공지 채널에서 확인해주세요.'],
  ['친구 초대', '{user.name} 등장! 지금 멤버는 {server.count}명이야.'],
  ['프리미엄 하트', '{user.mention} 환영해! 일부 기능은 프리미엄 하트 인증 후 사용할 수 있어.'],
  ['짧은 문구', '{user.mention} 환영해!'],
  ['입장 회수', '{user.name} 님의 입장 카드는 나가면 자동 정리돼요.'],
];

const fallbackGuilds = [{
  id: 'preview',
  name: '유즈하 미리보기 서버',
  icon: '',
  manageable: true,
  botPresent: true,
  channels: [
    { id: 'notice', name: '공지', type: 'text' },
    { id: 'welcome', name: '환영인사', type: 'text' },
    { id: 'tts-chat', name: '유즈하-tts', type: 'text' },
    { id: 'voice-main', name: '음성여우굴', type: 'voice' },
    { id: 'cat-voice', name: '음성여우굴', type: 'category' },
  ],
}];

const defaultBots = [
  { key: 'natsumi', name: '나츠미', botId: '905355491708903485', enabled: true },
  { key: 'yuzuha', name: '유즈하', botId: '1508101246723035196', enabled: true },
];

const defaultSettings = {
  disabledCommands: [],
  features: { welcome: false, ticket: true, tts: false, ai: true, shop: true, emojiUpscale: false, level: false, moderation: false },
  welcome: { enabled: false, channelId: '', leaveChannelId: '', cleanupOnLeave: true, message: '어서 와, {user.mention}! {server.name}에 온 걸 환영해!', aiPrompt: '' },
  yuzuha: { enabled: false, dmWelcomeEnabled: false, channelId: '', leaveChannelId: '', cleanupOnLeave: true, message: '유즈하가 인사할게요, {user.mention}! {server.name}에 온 걸 환영해요.', dmMessage: '안녕하세요, {user.name}! {server.name}에 와줘서 고마워요.', aiPrompt: '' },
  tts: { enabled: false, categoryId: '', textChannelId: '', voiceChannelId: '', voice: 'edge_ko_sunhi' },
  emojiUpscale: { enabled: false, channelId: '', webhookName: 'Yuzuha Emoji Upscaler' },
  moderation: {
    enabled: false,
    badWordDetect: false,
    deleteMessage: true,
    warnOnBadWord: true,
    timeoutThreshold: 3,
    timeoutMinutes: 10,
    kickThreshold: 5,
    logChannelId: '',
    extraBadWords: [],
    whitelist: { users: [], roles: [], channels: [] },
    antiRaid: {
      enabled: false,
      action: 'log',
      windowSeconds: 15,
      channelCreateLimit: 5,
      roleDeleteLimit: 3,
      memberKickLimit: 5,
      memberBanLimit: 5,
      suspiciousBotDetect: true,
      timeoutMinutes: 30,
    },
  },
};

const dashboardTabs = [
  ['settings', '설정'],
  ['welcome', '환영인사'],
  ['commands', '명령어 켜고 끄기'],
  ['tts', 'TTS 관리'],
  ['emoji', '이미지 업스케일'],
  ['moderation', '자동관리'],
  ['qna', '질문답변'],
];
const premiumTabs = new Set(['settings', 'welcome', 'commands', 'tts', 'emoji', 'moderation']);

const state = {
  theme: localStorage.getItem(themeKey) || 'light',
  loggedIn: false,
  profile: null,
  guilds: [],
  selectedGuild: null,
  settings: structuredClone(defaultSettings),
  activeTab: dashboardTabs.some(([key]) => key === initialParams.get('tab')) ? initialParams.get('tab') : 'notice',
  menuOpen: false,
  isOwner: false,
  canUseDashboard: false,
  announcements: [],
  botStatus: null,
  bots: structuredClone(defaultBots),
  selectedBot: initialParams.get('bot') === 'yuzuha' ? 'yuzuha' : (localStorage.getItem(selectedBotKey) || 'natsumi'),
  heart: { verified: false, heartUrl: 'https://koreanbots.dev/bots/905355491708903485' },
};

function esc(value = '') {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.status === 204 ? {} : res.json();
}

function currentBotKey() {
  return state.selectedBot === 'natsumi' ? 'natsumi' : 'yuzuha';
}

function withBot(path) {
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}bot=${encodeURIComponent(currentBotKey())}`;
}

function currentBotProfile() {
  return state.bots.find((bot) => bot.key === currentBotKey())
    || defaultBots.find((bot) => bot.key === currentBotKey())
    || defaultBots[0];
}

function applyTheme(next = state.theme) {
  state.theme = next;
  localStorage.setItem(themeKey, state.theme);
  document.documentElement.dataset.theme = state.theme;
}

function login() {
  window.location.href = `${API_BASE}/auth/discord/dashboard`;
}

function currentGuild() {
  return state.selectedGuild || state.guilds[0] || fallbackGuilds[0];
}

function botInviteUrl() {
  const botId = state.botStatus?.botId || currentBotProfile().botId || '905355491708903485';
  return `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(botId)}&permissions=8&scope=bot%20applications.commands`;
}

function channels() {
  return (currentGuild().channels || []).filter((channel) => channel.manageable !== false);
}

function manageableGuilds() {
  return (state.guilds || []).filter((guild) => guild.manageable !== false);
}

function localKey(guildId) {
  return `natsumi-dashboard-settings-${currentBotKey()}-${guildId}`;
}

function avatarUrl() {
  if (!state.profile) return NATSUMI_PROFILE_IMAGE;
  if (state.profile.avatar?.startsWith?.('http')) return state.profile.avatar;
  if (state.profile.avatar && state.profile.id) return `https://cdn.discordapp.com/avatars/${state.profile.id}/${state.profile.avatar}.png?size=128`;
  return NATSUMI_PROFILE_IMAGE;
}

function toggleCard({ id, label, description = '', checked = false, data = '' }) {
  return `
    <label class="toggle-card">
      <input type="checkbox" id="${esc(id)}" ${data} ${checked ? 'checked' : ''}>
      <span class="toggle-copy"><b>${esc(label)}</b>${description ? `<small>${esc(description)}</small>` : ''}</span>
      <span class="toggle-slider"><i></i><em>${checked ? '켜짐' : '꺼짐'}</em></span>
    </label>
  `;
}

function shell(content) {
  const profileName = state.profile?.globalName || state.profile?.username || '관리자';
  return `
    <div class="page-shell">
      ${renderPetals()}
      <header class="topbar glass">
        <button class="brand" data-action="notice" type="button">
          <span><img src="${NATSUMI_PROFILE_IMAGE}" alt="" /></span><b>${esc((currentBotProfile().name || 'YUZUHA').toUpperCase())}</b>
        </button>
        <div class="top-actions">
          <label class="mode-toggle" title="Theme">
            <input type="checkbox" data-action="theme-toggle" ${state.theme === 'dark' ? 'checked' : ''}>
            <span></span>
          </label>
          ${state.canUseDashboard ? `<button class="icon-menu-btn ${state.menuOpen ? 'active' : ''}" data-action="toggle-menu" type="button" aria-label="메뉴">☰</button>` : ''}
          ${state.loggedIn
            ? `<div class="login-pill"><img src="${esc(avatarUrl())}" alt="" /><b>${esc(profileName)}</b></div>`
            : `<button class="primary-btn" data-action="login" type="button">Discord Login</button>`}
        </div>
      </header>
      ${content}
      <footer class="footer glass">
        <b>${esc(currentBotProfile().name || '유즈하')} 관리자 모드</b>
        <small>공지사항은 공개로 보이고, 설정은 지정된 개발자와 서버 관리자만 사용할 수 있어요.</small>
      </footer>
    </div>
  `;
}

function renderPetals() {
  return `<div class="dashboard-petals" aria-hidden="true">${Array.from({ length: 14 }, (_, index) => {
    const x = 3 + ((index * 19) % 94);
    const drift = index % 2 === 0 ? 36 + index * 7 : -42 - index * 5;
    const delay = -(index % 9);
    const duration = 10 + (index % 6);
    const size = 9 + (index % 5) * 2;
    const spin = 240 + index * 31;
    return `<span style="--x:${x}vw;--drift:${drift}px;--delay:${delay}s;--dur:${duration}s;--size:${size}px;--spin:${spin}deg"></span>`;
  }).join('')}</div>`;
}

function publicNoticePage() {
  app.innerHTML = shell(`
    <main class="hero-panel glass">
      <p class="eyebrow">${esc(currentBotProfile().name || 'Yuzuha')} Notice</p>
      <h1>${esc(currentBotProfile().name || '유즈하')} 지원 서버</h1>
      <p class="hero-desc">${esc(currentBotProfile().name || '유즈하')}의 최신 소식과 점검 안내를 먼저 확인할 수 있어요.</p>
      <div class="hero-actions">
        <button class="soft-btn" data-action="refresh-public" type="button">새로고침</button>
        ${state.canUseDashboard ? '<button class="primary-btn" data-action="toggle-menu" type="button">관리 메뉴</button>' : ''}
      </div>
      ${renderDeveloperAnnouncements()}
    </main>
  `);
}

function dashboard() {
  if (!state.canUseDashboard) return publicNoticePage();
  const guild = currentGuild();
  app.innerHTML = shell(`
    <main class="dashboard-page">
      ${renderMenuDrawer()}
      <section class="main glass">
        <header class="main-head">
          <div><p class="eyebrow">${state.activeTab === 'notice' ? 'Notice' : 'Dashboard'}</p><h2>${state.activeTab === 'notice' ? '공지사항' : esc(tabLabel(state.activeTab))}</h2></div>
          <div class="main-actions">
            <button class="soft-btn" data-action="toggle-menu" type="button">${state.menuOpen ? '메뉴 닫기' : '메뉴 열기'}</button>
            <button class="soft-btn" data-action="refresh" type="button">새로고침</button>
          </div>
        </header>
        <div id="panel">${renderPanel()}</div>
      </section>
    </main>
  `);
}

function renderMenuDrawer() {
  if (!state.menuOpen) return '';
  const guild = currentGuild();
  return `
    <aside class="sidebar glass">
      <div class="profile-card">
        <div class="avatar big"><img src="${esc(avatarUrl())}" alt="" /></div>
        <div><b>${esc(state.profile?.globalName || state.profile?.username || 'yukiha_haruki')}</b><small>관리자 모드</small></div>
      </div>
      <label class="select-label">서버 선택</label>
      <select class="wide-select" id="botSelect">
        ${state.bots.filter((b) => b.enabled !== false).map((b) => `<option value="${esc(b.key)}" ${b.key === currentBotKey() ? 'selected' : ''}>${esc(b.name)} 설정</option>`).join('')}
      </select>
      <label class="select-label">길드 선택</label>
      <select class="wide-select" id="guildSelect">
        ${manageableGuilds().map((g) => `<option value="${esc(g.id)}" ${g.id === guild.id ? 'selected' : ''} ${g.botPresent === false ? 'data-missing-bot="1"' : ''}>${esc(g.name)}${g.botPresent === false ? ` · ${esc(currentBotProfile().name)} 초대 필요` : ''}${g.botPresent === null ? ` · ${esc(currentBotProfile().name)} 연동 확인 중` : ''}</option>`).join('')}
      </select>
      <div class="menu-list">
        <button class="menu-tile ${state.activeTab === 'notice' ? 'active' : ''}" data-tab="notice" type="button">공지사항</button>
        ${dashboardTabs.map(([tab, label]) => `<button class="menu-tile ${state.activeTab === tab ? 'active' : ''}" data-tab="${tab}" type="button">${label}</button>`).join('')}
      </div>
    </aside>
  `;
}

function renderPanel() {
  const guild = currentGuild();
  if (state.activeTab === 'notice') return renderDeveloperAnnouncements();
  if (guild.botPresent === null) return renderBotTokenRequired();
  if (guild.botPresent === false) return renderInviteRequired(guild);
  if (premiumTabs.has(state.activeTab) && !state.heart.verified) return renderHeartLock();
  if (state.activeTab === 'settings') return renderSettings();
  if (state.activeTab === 'welcome') return renderWelcome();
  if (state.activeTab === 'commands') return renderCommands();
  if (state.activeTab === 'tts') return renderTts();
  if (state.activeTab === 'emoji') return renderEmoji();
  if (state.activeTab === 'moderation') return renderModeration();
  if (state.activeTab === 'qna') return renderQna();
  return renderDeveloperAnnouncements();
}

function renderInviteRequired(guild) {
  const botName = currentBotProfile().name;
  return `
    <section class="tool-card invite-required">
      <h3>${esc(botName)}를 먼저 초대해야 해요</h3>
      <p>${esc(guild.name)} 서버는 관리자 권한은 확인됐지만, ${esc(botName)}가 아직 들어가 있지 않거나 채널 정보를 읽을 수 없어요. ${esc(botName)}를 초대한 뒤 다시 새로고침해줘.</p>
      <div class="form-actions">
        <a class="primary-btn" href="${botInviteUrl()}" target="_blank" rel="noreferrer">${esc(botName)} 초대하기</a>
        <button class="soft-btn" data-action="refresh" type="button">다시 확인</button>
      </div>
    </section>
  `;
}

function renderBotTokenRequired() {
  const botName = currentBotProfile().name;
  return `
    <section class="tool-card invite-required">
      <h3>${esc(botName)} 연동을 확인하는 중이에요</h3>
      <p>대시보드 서버에 ${esc(botName)} 봇 토큰이 없으면 Discord API로 서버 초대 여부를 확인할 수 없어요. 토큰이 연결되면 실제 초대된 서버만 정상 설정 화면으로 열려요.</p>
      <div class="form-actions">
        <button class="soft-btn" data-action="refresh" type="button">다시 확인</button>
      </div>
    </section>
  `;
}

function renderHeartLock() {
  return `
    <section class="tool-card heart-lock">
      <h3>한디리 하트가 필요한 관리 도구예요</h3>
      <p>환영인사, TTS, 자동관리, 이모지 업스케일 같은 서버 자동화 도구는 하트 인증 후 사용할 수 있어요.</p>
      <div class="form-actions">
        <a class="primary-btn" href="${esc(state.heart.heartUrl)}" target="_blank" rel="noreferrer">하트 누르기</a>
        <button class="soft-btn" data-action="refresh-heart" type="button">하트 확인</button>
      </div>
    </section>
  `;
}

function renderDeveloperAnnouncements() {
  const rows = state.announcements || [];
  return `
    <section class="support-board" id="developer-notice">
      <div class="section-title notice-title">
        <div>
          <h3>공지사항</h3>
          <p>${esc(currentBotProfile().name || '유즈하')}의 최신 소식과 점검 안내가 여기에 올라와요.</p>
        </div>
        <span class="notice-count">${rows.length ? `${rows.length}개` : '대기 중'}</span>
      </div>
      <div class="notice-feed">
        ${rows.map((row) => `
          <article class="support-notice-card">
            <h4>${esc(row.title || `${currentBotProfile().name || '유즈하'} 지원서버 공지`)}</h4>
            ${row.subtitle ? `<b>${esc(row.subtitle)}</b>` : ''}
            <p>${esc(row.message || '')}</p>
            ${row.imageUrl ? `<img class="notice-image" src="${esc(row.imageUrl)}" alt="" />` : ''}
            <time datetime="${row.createdAt ? esc(new Date(row.createdAt).toISOString()) : ''}">${formatNoticeTime(row.createdAt)}</time>
          </article>
        `).join('') || '<article class="support-notice-card"><h4>공지사항</h4><p>아직 등록된 지원서버 공지가 없어요.</p></article>'}
      </div>
    </section>
  `;
}

function formatNoticeTime(value) {
  if (!value) return '최근 공지';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '최근 공지';
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  return date.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function renderSettings() {
  const features = state.settings.features || {};
  return `
    <section class="section-title"><h3>설정</h3><p>서버 기능을 슬라이드 버튼으로 켜고 끌 수 있어요.</p></section>
    <div class="toggle-grid">
      ${Object.entries(features).map(([key, value]) => toggleCard({
        id: `feature-${key}`,
        label: featureName(key),
        description: featureDesc(key),
        checked: Boolean(value),
        data: `data-feature="${key}"`,
      })).join('')}
    </div>
    <div class="form-actions"><button class="primary-btn" data-action="save-settings" type="button">설정 저장</button></div>
  `;
}

function renderWelcome() {
  const welcome = state.settings.welcome || defaultSettings.welcome;
  const yuzuha = state.settings.yuzuha || defaultSettings.yuzuha;
  const isYuzuha = currentBotKey() === 'yuzuha';
  const titleName = currentBotProfile().name || (isYuzuha ? '유즈하' : '나츠미');
  if (isYuzuha) {
    return `
      <section class="section-title"><h3>${esc(titleName)} 환영인사</h3><p>유즈하의 환영/DM/회수 설정만 따로 관리해요.</p></section>
      <div class="toggle-grid">
        ${toggleCard({ id: 'yuzuhaWelcomeEnabled', label: '유즈하 환영인사 켜기', description: '유즈하 명의로 환영 카드를 보내요.', checked: Boolean(yuzuha.enabled) })}
        ${toggleCard({ id: 'yuzuhaDmWelcomeEnabled', label: 'DM 환영인사', description: '입장 멤버에게 유즈하 DM 인사를 보내요.', checked: Boolean(yuzuha.dmWelcomeEnabled) })}
        ${toggleCard({ id: 'yuzuhaCleanupOnLeave', label: '퇴장 시 환영 메시지 회수', description: '유즈하 환영 메시지를 퇴장 시 정리해요.', checked: yuzuha.cleanupOnLeave !== false })}
      </div>
      <div class="form-grid">
        <label>유즈하 환영 채널<select id="yuzuhaWelcomeChannel">${optionList('text', yuzuha.channelId)}</select></label>
        <label>유즈하 퇴장 카드 채널<select id="yuzuhaLeaveChannel">${optionList('text', yuzuha.leaveChannelId || yuzuha.channelId)}</select></label>
        <label>유즈하 AI 환영 프롬프트<textarea id="yuzuhaAiPrompt" placeholder="유즈하 톤으로 환영 프롬프트를 적어줘">${esc(yuzuha.aiPrompt || '')}</textarea></label>
        <label>유즈하 고정 메시지<textarea id="yuzuhaWelcomeMessage" placeholder="변수를 넣어 유즈하 환영 문구를 적어줘">${esc(yuzuha.message || '')}</textarea></label>
        <label>유즈하 DM 문구<textarea id="yuzuhaDmMessage" placeholder="유즈하 DM 환영 문구">${esc(yuzuha.dmMessage || '')}</textarea></label>
      </div>
      <section class="tool-card"><h4>변수 삽입</h4><div class="chip-grid">${welcomeVariables.map((v) => `<button class="chip" data-insert="${esc(v)}" type="button">${esc(v)}</button>`).join('')}</div></section>
      <section class="tool-card">
        <div class="split-head"><h4>샘플 템플릿 11개</h4><button class="ghost-btn" data-action="clear-template" type="button">모두 지우기</button></div>
        <div class="template-grid">${sampleTemplates.map(([name, text]) => `<button class="template-card" data-template="${esc(text)}" type="button"><b>${esc(name)}</b><small>${esc(text)}</small></button>`).join('')}</div>
      </section>
      <div class="form-actions">
        <button class="soft-btn" data-action="test-welcome" type="button">테스트 메시지 보내기</button>
        <button class="primary-btn" data-action="save-welcome" type="button">유즈하 환영인사 저장</button>
      </div>
    `;
  }
  return `
    <section class="section-title"><h3>${esc(titleName)} 환영인사</h3><p>나츠미의 입장 카드와 환영 멘트만 따로 관리해요.</p></section>
    <div class="toggle-grid">
      ${toggleCard({ id: 'welcomeEnabled', label: '환영인사 켜기', description: '멤버가 들어오면 환영 카드를 보내요.', checked: Boolean(welcome.enabled) })}
      ${toggleCard({ id: 'cleanupOnLeave', label: '퇴장 시 환영 메시지 회수', description: '멤버가 나가면 기존 환영 메시지를 정리해요.', checked: welcome.cleanupOnLeave !== false })}
    </div>
    <div class="form-grid">
      <label>환영 채널<select id="welcomeChannel">${optionList('text', welcome.channelId)}</select></label>
      <label>퇴장 카드 채널<select id="leaveChannel">${optionList('text', welcome.leaveChannelId || welcome.channelId)}</select></label>
      <label>AI 환영 프롬프트<textarea id="aiPrompt" placeholder="어떤 분위기로 환영할지 적어줘">${esc(welcome.aiPrompt || '')}</textarea></label>
      <label>고정 메시지<textarea id="welcomeMessage" placeholder="변수를 넣어 환영 문구를 적어줘">${esc(welcome.message || '')}</textarea></label>
    </div>
    <section class="tool-card"><h4>변수 삽입</h4><div class="chip-grid">${welcomeVariables.map((v) => `<button class="chip" data-insert="${esc(v)}" type="button">${esc(v)}</button>`).join('')}</div></section>
    <section class="tool-card">
      <div class="split-head"><h4>샘플 템플릿 11개</h4><button class="ghost-btn" data-action="clear-template" type="button">모두 지우기</button></div>
      <div class="template-grid">${sampleTemplates.map(([name, text]) => `<button class="template-card" data-template="${esc(text)}" type="button"><b>${esc(name)}</b><small>${esc(text)}</small></button>`).join('')}</div>
    </section>
    <div class="form-actions">
      <button class="soft-btn" data-action="test-welcome" type="button">테스트 메시지 보내기</button>
      <button class="primary-btn" data-action="save-welcome" type="button">나츠미 환영인사 저장</button>
    </div>
  `;
}

function renderCommands() {
  const disabled = new Set(state.settings.disabledCommands || []);
  return `
    <section class="section-title"><h3>명령어 켜고 끄기</h3><p>관리자 전용 명령어는 제외하고 일반 기능 명령어만 제어해요.</p></section>
    <div class="toggle-grid dense">
      ${commandList.map((cmd) => toggleCard({
        id: `command-${cmd.name}`,
        label: `/${cmd.name}`,
        description: `${cmd.description} · ${cmd.group}${cmd.heart ? ' · 프리미엄 하트' : ''}`,
        checked: !disabled.has(cmd.name),
        data: `data-command="${esc(cmd.name)}"`,
      })).join('')}
    </div>
    <div class="form-actions"><button class="primary-btn" data-action="save-commands" type="button">명령어 설정 저장</button></div>
  `;
}

function renderTts() {
  const tts = { ...(state.settings.tts || defaultSettings.tts), voice: normalizeVoice(state.settings.tts?.voice) };
  return `
    <section class="section-title"><h3>TTS 관리</h3><p>전용 채팅방에 글을 쓰면 ${esc(currentBotProfile().name || '유즈하')}가 음성채널에 들어가 읽어줘요.</p></section>
    <div class="toggle-grid">${toggleCard({ id: 'ttsEnabled', label: 'TTS 켜기', description: '전용 채팅방 메시지를 음성으로 읽어요.', checked: Boolean(tts.enabled) })}</div>
    <div class="form-grid">
      <label>TTS 카테고리<select id="ttsCategory">${optionList('category', tts.categoryId)}</select></label>
      <label>TTS 채팅 채널<select id="ttsText">${optionList('text', tts.textChannelId)}</select></label>
      <label>읽어줄 음성 채널<select id="ttsVoiceChannel">${optionList('voice', tts.voiceChannelId)}</select></label>
      <label>기본 목소리<select id="ttsVoice">${voiceOptions(tts.voice)}</select></label>
    </div>
    <div class="form-actions"><button class="primary-btn" data-action="save-tts" type="button">TTS 설정 저장</button></div>
  `;
}

function renderEmoji() {
  const emoji = state.settings.emojiUpscale || defaultSettings.emojiUpscale;
  return `
    <section class="section-title"><h3>이미지 업스케일</h3><p>이모지를 크게 보여주는 기능을 관리해요.</p></section>
    <div class="toggle-grid">${toggleCard({ id: 'emojiEnabled', label: '이모지 업스케일 켜기', description: '커스텀 이모지 확대만 처리하고 일반 사진은 건드리지 않아요.', checked: Boolean(emoji.enabled) })}</div>
    <div class="form-grid">
      <label>반응 채널<select id="emojiChannel">${optionList('text', emoji.channelId, '모든 채널에서 자동 반응')}</select></label>
      <label>웹훅 표시 이름<input id="emojiWebhookName" value="${esc(emoji.webhookName || 'Yuzuha Emoji Upscaler')}" /></label>
    </div>
    <div class="form-actions"><button class="primary-btn" data-action="save-emoji" type="button">이모지 설정 저장</button></div>
  `;
}

function renderModeration() {
  const moderation = { ...defaultSettings.moderation, ...(state.settings.moderation || {}) };
  const whitelist = { ...defaultSettings.moderation.whitelist, ...(moderation.whitelist || {}) };
  const antiRaid = { ...defaultSettings.moderation.antiRaid, ...(moderation.antiRaid || {}) };
  const words = Array.isArray(moderation.extraBadWords) ? moderation.extraBadWords.join('\n') : String(moderation.extraBadWords || '');
  return `
    <section class="section-title"><h3>자동관리</h3><p>켜기 전까지는 자동 처벌이 작동하지 않아요. 처음에는 로그만 남기기로 테스트하는 걸 추천해요.</p></section>
    <div class="toggle-grid">
      ${toggleCard({ id: 'moderationEnabled', label: '자동관리 켜기', description: '금지어와 자동 로그를 사용할 수 있어요.', checked: Boolean(moderation.enabled) })}
      ${toggleCard({ id: 'badWordDetect', label: '욕설/금지어 감지', description: '설정한 금지어를 감지해요.', checked: Boolean(moderation.badWordDetect) })}
      ${toggleCard({ id: 'deleteBadWord', label: '감지 메시지 삭제', description: '감지된 메시지를 바로 지워요.', checked: moderation.deleteMessage !== false })}
      ${toggleCard({ id: 'warnBadWord', label: '감지 시 경고 추가', description: '감지된 유저에게 경고 1회를 추가해요.', checked: moderation.warnOnBadWord !== false })}
      ${toggleCard({ id: 'antiRaidEnabled', label: '테러방지 켜기', description: '대량 생성/삭제/추방/차단을 감지해요.', checked: Boolean(antiRaid.enabled) })}
      ${toggleCard({ id: 'suspiciousBotDetect', label: '봇 추가 감지', description: '의심스러운 봇 추가를 기록해요.', checked: antiRaid.suspiciousBotDetect !== false })}
    </div>
    <div class="form-grid">
      <label>자동관리 로그 채널<select id="moderationLogChannel">${optionList('text', moderation.logChannelId, '자동 생성 또는 채널 선택')}</select></label>
      <label>대응 방식<select id="antiRaidAction">${[['log', '로그만 남기기'], ['timeout', '타임아웃'], ['kick', '추방'], ['ban', '차단']].map(([value, label]) => `<option value="${value}" ${antiRaid.action === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
      <label>타임아웃 기준 경고 횟수<input id="timeoutThreshold" type="number" min="0" max="100" value="${Number(moderation.timeoutThreshold || 0)}" /></label>
      <label>타임아웃 시간(분)<input id="timeoutMinutes" type="number" min="1" max="40320" value="${Number(moderation.timeoutMinutes || 10)}" /></label>
      <label>추방 기준 경고 횟수<input id="kickThreshold" type="number" min="0" max="100" value="${Number(moderation.kickThreshold || 0)}" /></label>
      <label>감지 시간 창(초)<input id="antiRaidWindow" type="number" min="5" max="300" value="${Number(antiRaid.windowSeconds || 15)}" /></label>
      <label>대량 채널 생성 기준<input id="channelCreateLimit" type="number" min="1" max="100" value="${Number(antiRaid.channelCreateLimit || 5)}" /></label>
      <label>대량 역할 삭제 기준<input id="roleDeleteLimit" type="number" min="1" max="100" value="${Number(antiRaid.roleDeleteLimit || 3)}" /></label>
      <label>대량 멤버 추방 기준<input id="memberKickLimit" type="number" min="1" max="100" value="${Number(antiRaid.memberKickLimit || 5)}" /></label>
      <label>대량 멤버 차단 기준<input id="memberBanLimit" type="number" min="1" max="100" value="${Number(antiRaid.memberBanLimit || 5)}" /></label>
      <label>테러 대응 타임아웃(분)<input id="antiRaidTimeoutMinutes" type="number" min="1" max="1440" value="${Number(antiRaid.timeoutMinutes || 30)}" /></label>
      <label>추가 금지어<textarea id="extraBadWords" placeholder="한 줄에 하나씩 적어줘">${esc(words)}</textarea></label>
      <label>예외 유저 ID<textarea id="whitelistUsers" placeholder="1293232804745838733">${esc((whitelist.users || []).join('\n'))}</textarea></label>
      <label>예외 역할 ID<textarea id="whitelistRoles" placeholder="role id">${esc((whitelist.roles || []).join('\n'))}</textarea></label>
      <label>예외 채널 ID<textarea id="whitelistChannels" placeholder="channel id">${esc((whitelist.channels || []).join('\n'))}</textarea></label>
    </div>
    <section class="tool-card">
      <h4>익명 가면방 유동 IP 조회</h4>
      <p>문제가 된 유동 IP를 넣으면 실제 유저 ID와 프로필 이름을 확인할 수 있어요. 관리자만 조회돼요.</p>
      <div class="form-grid"><label>유동 IP<input id="anonLookupIp" placeholder="123.45.67.89" /></label></div>
      <div class="form-actions"><button class="soft-btn" data-action="lookup-anon" type="button">유동 IP 조회</button></div>
      <div id="anonLookupResult" class="command-list"></div>
    </section>
    <div class="form-actions"><button class="primary-btn" data-action="save-moderation" type="button">자동관리 저장</button></div>
  `;
}

function renderQna() {
  return `
    <section class="section-title"><h3>질문답변</h3><p>사용자는 질문을 남기고 개발자는 답변할 수 있어요.</p></section>
    <div class="form-grid"><label>질문 작성<textarea id="questionText" placeholder="궁금한 내용을 적어줘"></textarea></label></div>
    <div class="form-actions">
      <button class="soft-btn" data-action="load-qna" type="button">질문 목록 불러오기</button>
      <button class="primary-btn" data-action="send-question" type="button">질문 보내기</button>
    </div>
    <div id="qnaList" class="command-list"></div>
  `;
}

function tabLabel(tab) {
  return dashboardTabs.find(([key]) => key === tab)?.[1] || '공지사항';
}

function featureName(key) {
  return ({ level: '레벨/랭크', welcome: '환영인사', ticket: '티켓', tts: 'TTS', ai: 'AI', shop: '웹상점', emojiUpscale: '이모지 업스케일', moderation: '자동관리', notice: '공지' })[key] || key;
}

function featureDesc(key) {
  return ({
    level: '랭크카드와 경험치 표시를 제어해요.',
    welcome: '입장과 퇴장 카드를 제어해요.',
    ticket: '티켓 설정 기능을 제어해요.',
    tts: '채팅을 음성으로 읽는 기능을 제어해요.',
    ai: 'AI 채팅과 그림 기능을 제어해요.',
    shop: '웹상점과 후원 보상 기능을 제어해요.',
    emojiUpscale: '이모지 확대 기능을 제어해요.',
    moderation: '자동관리와 테러방지를 제어해요.',
  })[key] || '서버 기능을 제어해요.';
}

function optionList(type, selected = '', emptyLabel = null) {
  const typed = channels().filter((channel) => channel.type === type);
  const label = emptyLabel || (type === 'voice' ? '음성 채널 선택' : type === 'category' ? '카테고리 선택' : '채팅 채널 선택');
  return `<option value="">${label}</option>${typed.map((channel) => `<option value="${esc(channel.id)}" ${channel.id === selected ? 'selected' : ''}># ${esc(channel.name)}</option>`).join('')}`;
}

function voiceOptions(selected = '') {
  return voiceList.map(([value, label]) => `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(label)}</option>`).join('');
}

async function loadSession() {
  try {
    const data = await api('/api/auth/me');
    state.loggedIn = Boolean(data.user);
    state.profile = data.user || null;
    state.isOwner = Boolean(data.isOwner);
    state.canUseDashboard = Boolean(data.canUseDashboard || data.user);
    if (state.loggedIn && state.canUseDashboard) state.menuOpen = true;
  } catch {
    state.loggedIn = false;
    state.profile = null;
    state.isOwner = false;
    state.canUseDashboard = false;
  }
}

async function loadBots() {
  try {
    const data = await api('/api/dashboard/bots');
    const remoteBots = Array.isArray(data.bots) ? data.bots : [];
    state.bots = defaultBots.map((fallback) => ({
      ...(remoteBots.find((bot) => bot.key === fallback.key) || {}),
      ...fallback,
      botId: remoteBots.find((bot) => bot.key === fallback.key)?.botId || fallback.botId,
      enabled: true,
    }));
    if (!state.bots.some((bot) => bot.key === state.selectedBot && bot.enabled !== false)) {
      state.selectedBot = 'natsumi';
    }
    localStorage.setItem(selectedBotKey, state.selectedBot);
  } catch {
    state.bots = structuredClone(defaultBots);
    if (!state.bots.some((bot) => bot.key === state.selectedBot)) state.selectedBot = 'natsumi';
  }
}

async function loadGuilds() {
  if (!state.canUseDashboard) {
    state.guilds = [];
    state.selectedGuild = null;
    return;
  }
  try {
    const data = await api(withBot('/api/dashboard/guilds'));
    const guilds = data.guilds?.length ? data.guilds : fallbackGuilds;
    state.guilds = guilds.filter((guild) => guild.manageable !== false);
  } catch {
    state.guilds = fallbackGuilds;
  }
  const saved = localStorage.getItem(selectedGuildKey);
  state.selectedGuild = state.guilds.find((guild) => guild.id === saved) || state.guilds[0] || fallbackGuilds[0];
}

async function loadSettings() {
  if (!state.canUseDashboard || currentGuild().botPresent === false || currentGuild().botPresent === null) {
    state.settings = structuredClone(defaultSettings);
    return;
  }
  const guild = currentGuild();
  try {
    const data = await api(withBot(`/api/dashboard/guilds/${guild.id}/settings`));
    state.settings = deepMerge(structuredClone(defaultSettings), data.settings || data);
  } catch {
    const saved = localStorage.getItem(localKey(guild.id));
    state.settings = saved ? deepMerge(structuredClone(defaultSettings), JSON.parse(saved)) : structuredClone(defaultSettings);
  }
}

function deepMerge(base, extra) {
  for (const [key, value] of Object.entries(extra || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value) && base[key] && typeof base[key] === 'object' && !Array.isArray(base[key])) {
      base[key] = deepMerge({ ...base[key] }, value);
    } else {
      base[key] = value;
    }
  }
  return base;
}

async function loadDeveloperAnnouncements() {
  try {
    const data = await api('/api/developer-announcements');
    state.announcements = data.announcements || [];
  } catch {
    state.announcements = [];
  }
}

async function loadBotStatus() {
  try {
    state.botStatus = await api(withBot('/api/bot-status'));
  } catch {
    state.botStatus = { apiOk: false };
  }
}

async function loadHeartStatus() {
  if (!state.loggedIn) {
    state.heart = { verified: false, heartUrl: state.heart.heartUrl };
    return;
  }
  try {
    state.heart = await api(withBot('/api/heart-status'));
  } catch {
    state.heart = { ...state.heart, verified: false };
  }
}

function formValue(selector) {
  return document.querySelector(selector)?.value?.trim() || '';
}

function formIdList(selector) {
  return formValue(selector).split(/[\n,\s]+/).map((id) => id.trim()).filter(Boolean);
}

function collectSettingsFromDom() {
  const next = structuredClone(state.settings);

  if (state.activeTab === 'settings') {
    next.features = { ...next.features, ...Object.fromEntries([...document.querySelectorAll('[data-feature]')].map((input) => [input.dataset.feature, input.checked])) };
  }
  if (state.activeTab === 'commands') {
    next.disabledCommands = [...document.querySelectorAll('[data-command]')].filter((input) => !input.checked).map((input) => input.dataset.command);
  }
  if (state.activeTab === 'welcome') {
    if (currentBotKey() === 'yuzuha') {
      next.yuzuha = {
        ...next.yuzuha,
        enabled: document.querySelector('#yuzuhaWelcomeEnabled')?.checked || false,
        dmWelcomeEnabled: document.querySelector('#yuzuhaDmWelcomeEnabled')?.checked || false,
        cleanupOnLeave: document.querySelector('#yuzuhaCleanupOnLeave')?.checked !== false,
        channelId: formValue('#yuzuhaWelcomeChannel'),
        leaveChannelId: formValue('#yuzuhaLeaveChannel'),
        aiPrompt: formValue('#yuzuhaAiPrompt'),
        message: formValue('#yuzuhaWelcomeMessage'),
        dmMessage: formValue('#yuzuhaDmMessage'),
      };
    } else {
      next.welcome = {
        ...next.welcome,
        enabled: document.querySelector('#welcomeEnabled')?.checked || false,
        cleanupOnLeave: document.querySelector('#cleanupOnLeave')?.checked !== false,
        channelId: formValue('#welcomeChannel'),
        leaveChannelId: formValue('#leaveChannel'),
        aiPrompt: formValue('#aiPrompt'),
        message: formValue('#welcomeMessage'),
      };
    }
  }
  if (state.activeTab === 'tts') {
    next.tts = {
      ...next.tts,
      enabled: document.querySelector('#ttsEnabled')?.checked || false,
      categoryId: formValue('#ttsCategory'),
      textChannelId: formValue('#ttsText'),
      voiceChannelId: formValue('#ttsVoiceChannel'),
      voice: normalizeVoice(formValue('#ttsVoice')),
    };
  }
  if (state.activeTab === 'emoji') {
    next.emojiUpscale = {
      ...next.emojiUpscale,
      enabled: document.querySelector('#emojiEnabled')?.checked || false,
      channelId: formValue('#emojiChannel'),
      webhookName: formValue('#emojiWebhookName') || 'Yuzuha Emoji Upscaler',
    };
  }
  if (state.activeTab === 'moderation') {
    next.moderation = {
      ...next.moderation,
      enabled: document.querySelector('#moderationEnabled')?.checked || false,
      badWordDetect: document.querySelector('#badWordDetect')?.checked || false,
      deleteMessage: document.querySelector('#deleteBadWord')?.checked !== false,
      warnOnBadWord: document.querySelector('#warnBadWord')?.checked !== false,
      logChannelId: formValue('#moderationLogChannel'),
      timeoutThreshold: Number(formValue('#timeoutThreshold') || 0),
      timeoutMinutes: Number(formValue('#timeoutMinutes') || 10),
      kickThreshold: Number(formValue('#kickThreshold') || 0),
      extraBadWords: formValue('#extraBadWords').split(/\n|,/).map((word) => word.trim()).filter(Boolean),
      whitelist: {
        users: formIdList('#whitelistUsers'),
        roles: formIdList('#whitelistRoles'),
        channels: formIdList('#whitelistChannels'),
      },
      antiRaid: {
        enabled: document.querySelector('#antiRaidEnabled')?.checked || false,
        action: formValue('#antiRaidAction') || 'log',
        windowSeconds: Number(formValue('#antiRaidWindow') || 15),
        channelCreateLimit: Number(formValue('#channelCreateLimit') || 5),
        roleDeleteLimit: Number(formValue('#roleDeleteLimit') || 3),
        memberKickLimit: Number(formValue('#memberKickLimit') || 5),
        memberBanLimit: Number(formValue('#memberBanLimit') || 5),
        suspiciousBotDetect: document.querySelector('#suspiciousBotDetect')?.checked !== false,
        timeoutMinutes: Number(formValue('#antiRaidTimeoutMinutes') || 30),
      },
    };
    next.features = { ...next.features, moderation: next.moderation.enabled };
  }
  return next;
}

async function saveSettings() {
  if (!state.canUseDashboard) return publicNoticePage();
  if (currentGuild().botPresent === false) return toast(`${currentBotProfile().name}를 먼저 서버에 초대해줘.`);
  if (premiumTabs.has(state.activeTab) && !state.heart.verified) {
    toast('한디리 하트를 확인해야 사용할 수 있어요.');
    return dashboard();
  }
  const guild = currentGuild();
  const settings = collectSettingsFromDom();
  state.settings = settings;
  localStorage.setItem(localKey(guild.id), JSON.stringify(settings));
  try {
    await api(withBot(`/api/dashboard/guilds/${guild.id}/settings`), { method: 'PATCH', body: JSON.stringify({ bot: currentBotKey(), settings }) });
    toast(`저장했어. ${currentBotProfile().name} 설정에 반영될 거야.`);
  } catch {
    toast('API 연결을 확인해줘. 브라우저에는 임시 저장했어.');
  }
}

async function sendWelcomeTest() {
  await saveSettings();
  try {
    await api(withBot(`/api/dashboard/guilds/${currentGuild().id}/welcome/test`), { method: 'POST', body: JSON.stringify({ bot: currentBotKey(), settings: state.settings }) });
    toast('테스트 환영 메시지를 보냈어.');
  } catch {
    toast('테스트 API를 확인해야 해. 설정 저장은 완료됐어.');
  }
}

async function sendQuestion() {
  const question = formValue('#questionText');
  if (!question) return toast('질문 내용을 먼저 적어줘.');
  try {
    await api(`/api/dashboard/guilds/${currentGuild().id}/questions`, { method: 'POST', body: JSON.stringify({ question }) });
    document.querySelector('#questionText').value = '';
    toast('질문을 보냈어.');
    await loadQuestions();
  } catch {
    toast('질문 API가 아직 연결되지 않았거나 로그인이 필요해.');
  }
}

async function loadQuestions() {
  const list = document.querySelector('#qnaList');
  if (!list) return;
  try {
    const data = await api(`/api/dashboard/guilds/${currentGuild().id}/questions`);
    list.innerHTML = (data.questions || []).map((q) => `
      <article class="command-card">
        <div><h4>${esc(q.question || '질문')}</h4><p>${esc(q.answer || '아직 답변 없음')}</p></div>
      </article>
    `).join('') || '<article class="command-card"><div><h4>질문 없음</h4><p>아직 등록된 질문이 없어요.</p></div></article>';
  } catch {
    list.innerHTML = '<article class="command-card"><div><h4>불러오기 실패</h4><p>API 연결을 확인해줘.</p></div></article>';
  }
}

async function lookupAnonymousIp() {
  const out = document.querySelector('#anonLookupResult');
  const ip = document.querySelector('#anonLookupIp')?.value?.trim();
  if (!out || !ip) return toast('유동 IP를 입력해줘.');
  try {
    const data = await api(`/api/dashboard/guilds/${currentGuild().id}/anonymous/lookup?ip=${encodeURIComponent(ip)}`);
    out.innerHTML = `
      <article class="command-card">
        <div><h4>${esc(data.username || '이름 확인 불가')}</h4><p>유저 ID: ${esc(data.userId)} · 유동 IP: ${esc(data.anonIp)}</p></div>
      </article>
    `;
  } catch (error) {
    out.innerHTML = `<article class="command-card"><div><h4>조회 실패</h4><p>${esc(error.message || '기록을 찾지 못했어요.')}</p></div></article>`;
  }
}

function toast(message) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

app.addEventListener('click', async (event) => {
  const target = event.target.closest('button');
  if (!target) return;

  if (target.dataset.action === 'notice') {
    state.activeTab = 'notice';
    return state.canUseDashboard ? dashboard() : publicNoticePage();
  }
  if (target.dataset.action === 'login') return login();
  if (target.dataset.action === 'toggle-menu') {
    state.menuOpen = !state.menuOpen;
    return state.canUseDashboard ? dashboard() : publicNoticePage();
  }
  if (target.dataset.action === 'refresh-public') {
    await Promise.all([loadSession(), loadBots(), loadDeveloperAnnouncements(), loadBotStatus()]);
    await loadHeartStatus();
    return state.canUseDashboard ? dashboard() : publicNoticePage();
  }
  if (!state.canUseDashboard) return publicNoticePage();
  if (target.dataset.action === 'refresh') {
    await Promise.all([loadSession(), loadBots(), loadGuilds(), loadDeveloperAnnouncements(), loadBotStatus()]);
    await loadHeartStatus();
    await loadSettings();
    return dashboard();
  }
  if (target.dataset.action === 'refresh-heart') {
    await loadHeartStatus();
    if (state.heart.verified) toast('한디리 하트 확인 완료! 설정을 계속 사용할 수 있어요.');
    return dashboard();
  }
  if (target.dataset.tab) {
    state.activeTab = target.dataset.tab;
    state.menuOpen = false;
    if (state.activeTab !== 'notice') await loadSettings();
    return dashboard();
  }
  if (target.dataset.insert) {
    const textarea = document.querySelector('#welcomeMessage');
    if (textarea) {
      textarea.value = `${textarea.value}${textarea.value.endsWith(' ') || !textarea.value ? '' : ' '}${target.dataset.insert}`;
      textarea.focus();
    }
  }
  if (target.dataset.template) {
    const textarea = document.querySelector('#welcomeMessage');
    if (textarea) textarea.value = target.dataset.template;
  }
  if (target.dataset.action === 'clear-template') {
    const textarea = document.querySelector('#welcomeMessage');
    const prompt = document.querySelector('#aiPrompt');
    if (textarea) textarea.value = '';
    if (prompt) prompt.value = '';
    toast('템플릿과 작성 내용을 비웠어.');
  }
  if (target.dataset.action?.startsWith('save-')) return saveSettings();
  if (target.dataset.action === 'test-welcome') return sendWelcomeTest();
  if (target.dataset.action === 'send-question') return sendQuestion();
  if (target.dataset.action === 'load-qna') return loadQuestions();
  if (target.dataset.action === 'lookup-anon') return lookupAnonymousIp();
});

app.addEventListener('change', async (event) => {
  if (event.target.matches('[data-action="theme-toggle"]')) {
    applyTheme(event.target.checked ? 'dark' : 'light');
    return state.canUseDashboard ? dashboard() : publicNoticePage();
  }
  if (event.target.id === 'guildSelect' && state.canUseDashboard) {
    state.selectedGuild = manageableGuilds().find((guild) => guild.id === event.target.value) || manageableGuilds()[0] || fallbackGuilds[0];
    localStorage.setItem(selectedGuildKey, state.selectedGuild.id);
    state.activeTab = state.selectedGuild.botPresent === false ? state.activeTab : 'notice';
    await loadSettings();
    dashboard();
  }
  if (event.target.id === 'botSelect' && state.canUseDashboard) {
    state.selectedBot = event.target.value === 'natsumi' ? 'natsumi' : 'yuzuha';
    localStorage.setItem(selectedBotKey, state.selectedBot);
    await Promise.all([loadGuilds(), loadBotStatus(), loadHeartStatus()]);
    await loadSettings();
    dashboard();
  }
  if (event.target.closest('.toggle-card')) {
    const card = event.target.closest('.toggle-card');
    const em = card.querySelector('em');
    if (em) em.textContent = event.target.checked ? '켜짐' : '꺼짐';
  }
});

applyTheme();
await Promise.all([loadSession(), loadBots(), loadDeveloperAnnouncements(), loadBotStatus()]);
await loadHeartStatus();
if (state.canUseDashboard) {
  await loadBots();
  await loadGuilds();
  await loadSettings();
  dashboard();
} else {
  publicNoticePage();
}
