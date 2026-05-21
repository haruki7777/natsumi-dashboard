import './style.css';

const DASHBOARD_SERVER_URL = 'http://natsumidashboard.kro.kr:25901';
const API_BASE = (import.meta.env.VITE_API_BASE_URL || (location.hostname === 'localhost' ? window.location.origin : DASHBOARD_SERVER_URL)).replace(/\/$/, '');
const NATSUMI_PROFILE_IMAGE = '/natsumi-profile-03.jpg';
const themeKey = 'natsumi-dashboard-theme';
const selectedGuildKey = 'natsumi-dashboard-selected-guild';
const app = document.getElementById('app');

const ownerOnlyCommands = new Set(['개발자공지', '개발자답변', '명령어리로드', 'natsufix']);
const commandList = [
  ['도움말', '기본 안내와 링크를 보여줘요.', 'general'],
  ['핑', '봇 지연시간과 상태를 확인해요.', 'general'],
  ['진단', '봇 상태와 서버 연결을 확인해요.', 'general'],
  ['랭크', '레벨과 랭크카드를 보여줘요.', 'general'],
  ['랭킹', '서버 순위를 확인해요.', 'general'],
  ['유저정보', '유저 정보와 배너를 확인해요.', 'general'],
  ['서버정보', '서버 정보를 확인해요.', 'general'],
  ['웹상점', '웹상점 링크를 열어요.', 'general'],
  ['나츠미서버설정', '대시보드로 이동해요.', 'general', true],
  ['투표', '간단한 투표를 만들어요.', 'general'],
  ['문의', '개발자에게 문의를 보내요.', 'util'],
  ['이모지스틸', '이모지를 서버에 가져와요.', 'util'],
  ['밴', '멤버를 차단해요.', 'mod'],
  ['킥', '멤버를 추방해요.', 'mod'],
  ['타임아웃', '멤버에게 타임아웃을 걸어요.', 'mod'],
  ['청소', '메시지를 정리해요.', 'mod'],
  ['공지', '서버 공지를 보내요.', 'mod'],
  ['금지어', '금지어를 관리해요.', 'mod'],
  ['경고', '경고를 추가, 차감, 조회해요.', 'mod'],
  ['경고설정', '경고 로그와 자동 추방을 설정해요.', 'mod'],
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
  ['인벤토리', '가방을 확인해요.', 'game'],
].filter(([name]) => !ownerOnlyCommands.has(name)).map(([name, description, group, heart]) => ({ name, description, group, heart }));

const voiceList = [
  ['ko_warm_female', '한국어 여성 - 따뜻한 안내'],
  ['ko_clear_female', '한국어 여성 - 또렷한 진행'],
  ['ko_soft_female', '한국어 여성 - 부드러운 애니톤'],
  ['ko_bright_female', '한국어 여성 - 밝은 방송톤'],
  ['ko_calm_male', '한국어 남성 - 차분한 안내'],
  ['ja_soft_female', '일본어 여성 - 부드러운 애니톤'],
  ['ja_bright_female', '일본어 여성 - 밝은 캐릭터톤'],
  ['ja_calm_female', '일본어 여성 - 차분한 내레이션'],
  ['ja_clear_male', '일본어 남성 - 또렷한 진행'],
  ['default_natsumi', '기본 보이스 - 나츠미'],
];

const welcomeVariables = [
  '{user}', '{user.name}', '{user.tag}', '{user.id}', '{user.mention}',
  '{server}', '{server.name}', '{server.id}', '{server.count}', '{member.count}',
  '{account.created}', '{joined.at}', '{owner.id}', '{random.welcome}',
];

const sampleTemplates = [
  ['첫 인사', '{user.mention} 어서 와! {server.name}의 {member.count}번째 별이 되어줘서 고마워.'],
  ['랭크 카드', '환영해, {user.name}! 프로필 카드도 곧 준비해둘게.'],
  ['관리 안내', '{user.mention} 님이 입장했어요. 규칙을 확인하고 즐겁게 지내주세요.'],
  ['친근한 말투', '{random.welcome} {user.name}! 기다리고 있었어.'],
  ['AI 프롬프트', '새 멤버 {user.name}에게 짧고 따뜻한 나츠미식 환영 인사를 만들어줘.'],
  ['게임센터', 'PRESS START, {user.name}! {server.name} 모험을 시작했어.'],
  ['차분한 안내', '{user.mention} 님, 환영합니다. 필요한 안내는 공지 채널에서 확인해주세요.'],
  ['친구 초대', '{user.name} 등장! 다들 반겨줘. 지금 멤버는 {server.count}명이야.'],
  ['프리미엄 하트', '{user.mention} 환영해! 일부 기능은 프리미엄 하트 인증 후 사용할 수 있어.'],
  ['짧은 문구', '{user.mention} 환영해.'],
  ['입장 회수', '{user.name} 님의 입장 카드는 퇴장하면 자동 정리돼요.'],
];

const fallbackGuilds = [{
  id: 'preview',
  name: '나츠미 미리보기 서버',
  icon: '',
  manageable: true,
  channels: [
    { id: 'notice', name: '공지', type: 'text' },
    { id: 'welcome', name: '환영인사', type: 'text' },
    { id: 'tts-chat', name: '나츠미-tts', type: 'text' },
    { id: 'voice-main', name: '음성여우굴', type: 'voice' },
    { id: 'cat-voice', name: '음성여우굴', type: 'category' },
  ],
}];

const defaultSettings = {
  disabledCommands: [],
  features: { welcome: false, ticket: true, tts: false, ai: true, shop: true, emojiUpscale: false, level: false },
  welcome: { enabled: false, channelId: '', leaveChannelId: '', cleanupOnLeave: true, message: '어서 와, {user.mention}! {server.name}에 온 걸 환영해.', aiPrompt: '' },
  tts: { enabled: false, categoryId: '', textChannelId: '', voiceChannelId: '', voice: 'ko_warm_female' },
  emojiUpscale: { enabled: false, channelId: '', webhookName: 'Natsumi Emoji Upscaler' },
};

const state = {
  theme: localStorage.getItem(themeKey) || 'light',
  loggedIn: false,
  profile: null,
  guilds: [],
  selectedGuild: null,
  settings: structuredClone(defaultSettings),
  activeTab: 'overview',
  isOwner: false,
  announcements: [],
  botStatus: null,
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

function channels() {
  return currentGuild().channels || [];
}

function localKey(guildId) {
  return `natsumi-dashboard-settings-${guildId}`;
}

function avatarUrl() {
  if (!state.profile) return NATSUMI_PROFILE_IMAGE;
  if (state.profile.avatar?.startsWith?.('http')) return state.profile.avatar;
  if (state.profile.avatar && state.profile.id) return `https://cdn.discordapp.com/avatars/${state.profile.id}/${state.profile.avatar}.png?size=128`;
  return NATSUMI_PROFILE_IMAGE;
}

function shell(content) {
  const profileName = state.profile?.globalName || state.profile?.username || '관리자';
  return `
    <div class="page-shell">
      <header class="topbar glass">
        <button class="brand" data-action="home" type="button">
          <span><img src="${NATSUMI_PROFILE_IMAGE}" alt="" /></span><b>NATSUMI</b>
        </button>
        <div class="top-actions">
          <label class="mode-toggle" title="Theme">
            <input type="checkbox" data-action="theme-toggle" ${state.theme === 'dark' ? 'checked' : ''}>
            <span></span>
          </label>
          <button class="icon-menu-btn" data-action="mobile-menu" type="button" aria-label="메뉴">☰</button>
          ${state.loggedIn
            ? `<div class="login-pill"><img src="${esc(avatarUrl())}" alt="" /><b>${esc(profileName)}</b></div>`
            : `<button class="primary-btn" data-action="login" type="button">Discord Login</button>`}
        </div>
      </header>
      ${content}
      <footer class="footer glass">
        <b>나츠미 관리자 모드</b>
        <small>공지사항은 공개로 보이고, 설정은 지정된 개발자만 사용할 수 있어요.</small>
      </footer>
    </div>
  `;
}

function publicNoticePage() {
  app.innerHTML = shell(`
    <main class="hero-panel glass">
      <p class="eyebrow">Natsumi Notice</p>
      <h1>나츠미 지원 서버</h1>
      <p class="hero-desc">나츠미의 최신 소식과 점검 안내를 한눈에 볼 수 있어요.</p>
      <div class="hero-actions">
        <button class="soft-btn" data-action="refresh-public" type="button">새로고침</button>
        ${state.isOwner ? '<button class="primary-btn" data-action="owner-dashboard" type="button">관리자 모드</button>' : ''}
      </div>
      ${renderDeveloperAnnouncements()}
    </main>
  `);
}

function dashboard() {
  if (!state.isOwner) return publicNoticePage();
  const guild = currentGuild();
  app.innerHTML = shell(`
    <div class="dashboard-shell">
      <aside class="sidebar glass">
        <div class="profile-card">
          <div class="avatar big"><img src="${esc(avatarUrl())}" alt="" /></div>
          <div><b>${esc(state.profile?.globalName || state.profile?.username || 'yukiha_haruki')}</b><small>관리자 모드</small></div>
        </div>
        <label class="select-label">서버 선택</label>
        <select class="wide-select" id="guildSelect">${state.guilds.map((g) => `<option value="${esc(g.id)}" ${g.id === guild.id ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select>
        <div class="menu-list">
          ${[
            ['overview', '한눈에 보기'],
            ['settings', '설정'],
            ['welcome', '환영인사'],
            ['commands', '명령어 켜고 끄기'],
            ['tts', 'TTS 관리'],
            ['emoji', '이모지 업스케일'],
            ['qna', '질문답변'],
          ].map(([tab, label]) => `<button class="menu-tile ${state.activeTab === tab ? 'active' : ''}" data-tab="${tab}" type="button">${label}</button>`).join('')}
        </div>
      </aside>
      <main class="main glass">
        <header class="main-head">
          <div><p class="eyebrow">Selected Server</p><h2>${esc(guild.name)}</h2></div>
          <button class="soft-btn" data-action="refresh" type="button">새로고침</button>
        </header>
        <div id="panel">${renderPanel()}</div>
      </main>
    </div>
  `);
}

function renderPanel() {
  if (state.activeTab === 'settings') return renderSettings();
  if (state.activeTab === 'welcome') return renderWelcome();
  if (state.activeTab === 'commands') return renderCommands();
  if (state.activeTab === 'tts') return renderTts();
  if (state.activeTab === 'emoji') return renderEmoji();
  if (state.activeTab === 'qna') return renderQna();
  return renderOverview();
}

function renderDeveloperAnnouncements() {
  const rows = state.announcements || [];
  return `
    <section class="support-board" id="developer-notice">
      <div class="section-title notice-title">
        <div>
          <h3>공지사항</h3>
          <p>봇의 개발자 공지 명령어로 올라온 소식이에요. 새 공지는 위에 쌓이고, 지난 기록은 이 안에서 스크롤해서 볼 수 있어요.</p>
        </div>
        <span class="notice-count">${rows.length ? `${rows.length}개` : '대기 중'}</span>
      </div>
      <div class="notice-feed">
        ${rows.map((row) => `
          <article class="support-notice-card">
            <h4>${esc(row.title || '나츠미 지원서버 공지')}</h4>
            ${row.subtitle ? `<b>${esc(row.subtitle)}</b>` : ''}
            <p>${esc(row.message || '')}</p>
            ${row.imageUrl ? `<img class="notice-image" src="${esc(row.imageUrl)}" alt="" />` : ''}
            <time datetime="${row.createdAt ? esc(new Date(row.createdAt).toISOString()) : ''}" title="${row.createdAt ? esc(new Date(row.createdAt).toLocaleString('ko-KR')) : '최근 공지'}">
              ${formatNoticeTime(row.createdAt)}
            </time>
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
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  return date.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderOverview() {
  const guild = currentGuild();
  const status = state.botStatus || {};
  const featureEntries = Object.entries(state.settings.features || {});
  return `
    ${renderDeveloperAnnouncements()}
    <section class="section-title"><h3>한눈에 보기</h3><p>공지, API 연결, 봇 서버 상태를 첫 화면에서 확인해요.</p></section>
    <div class="stat-row">
      <article><span>API</span><b>${status.apiOk === false ? '주의' : '정상'}</b></article>
      <article><span>나츠미가 지키는 서버</span><b>${status.guildCount ?? '확인 중'}</b></article>
      <article><span>관리 가능한 서버</span><b>${state.guilds.length}</b></article>
      <article><span>채널</span><b>${channels().length}</b></article>
      <article><span>꺼진 명령어</span><b>${state.settings.disabledCommands?.length || 0}</b></article>
    </div>
    <div class="server-grid">
      <article class="server-card static-card"><div class="server-icon">${guild.icon ? `<img src="${esc(guild.icon)}" alt="" />` : 'N'}</div><div><b>${esc(guild.name)}</b><small>${guild.manageable === false ? '권한 확인 필요' : '관리 가능'}</small></div></article>
      ${featureEntries.map(([key, value]) => `<article class="mini-card"><span>${featureName(key)}</span><b>${value ? '켜짐' : '꺼짐'}</b></article>`).join('')}
    </div>
  `;
}

function renderSettings() {
  const features = state.settings.features || {};
  return `
    <section class="section-title"><h3>설정</h3><p>서버 기능을 전체적으로 켜고 꺼요.</p></section>
    <div class="command-list">
      ${Object.entries(features).map(([key, value]) => `
        <article class="command-card">
          <div><h4>${featureName(key)}</h4><p>${featureDesc(key)}</p></div>
          <label class="switch"><input type="checkbox" data-feature="${key}" ${value ? 'checked' : ''}><span></span></label>
        </article>
      `).join('')}
    </div>
    <div class="form-actions"><button class="primary-btn" data-action="save-settings" type="button">설정 저장</button></div>
  `;
}

function renderWelcome() {
  const welcome = state.settings.welcome || defaultSettings.welcome;
  return `
    <section class="section-title"><h3>환영인사</h3><p>채널과 문구를 지정하고 테스트 메시지로 확인해요.</p></section>
    <div class="form-grid">
      <label class="check-line"><input type="checkbox" id="welcomeEnabled" ${welcome.enabled ? 'checked' : ''}> 환영인사 켜기</label>
      <label class="check-line"><input type="checkbox" id="cleanupOnLeave" ${welcome.cleanupOnLeave !== false ? 'checked' : ''}> 멤버가 나가면 기존 환영 메시지 회수</label>
      <label>환영 채널<select id="welcomeChannel">${optionList('text', welcome.channelId)}</select></label>
      <label>퇴장 카드 채널<select id="leaveChannel">${optionList('text', welcome.leaveChannelId || welcome.channelId)}</select></label>
      <label>AI 환영 프롬프트<textarea id="aiPrompt" placeholder="새 멤버에게 어떤 분위기로 인사할지 적어줘">${esc(welcome.aiPrompt || '')}</textarea></label>
      <label>고정 메시지<textarea id="welcomeMessage" placeholder="변수를 넣어 환영 문구를 적어줘">${esc(welcome.message || '')}</textarea></label>
    </div>
    <section class="tool-card"><h4>변수 삽입</h4><div class="chip-grid">${welcomeVariables.map((v) => `<button class="chip" data-insert="${esc(v)}" type="button">${esc(v)}</button>`).join('')}</div></section>
    <section class="tool-card">
      <div class="split-head"><h4>샘플 템플릿 11개</h4><button class="ghost-btn" data-action="clear-template" type="button">모두 지우기</button></div>
      <div class="template-grid">${sampleTemplates.map(([name, text]) => `<button class="template-card" data-template="${esc(text)}" type="button"><b>${esc(name)}</b><small>${esc(text)}</small></button>`).join('')}</div>
    </section>
    <div class="form-actions">
      <button class="soft-btn" data-action="test-welcome" type="button">테스트 메시지 보내기</button>
      <button class="primary-btn" data-action="save-welcome" type="button">환영인사 저장</button>
    </div>
  `;
}

function renderCommands() {
  const disabled = new Set(state.settings.disabledCommands || []);
  return `
    <section class="section-title"><h3>명령어 켜고 끄기</h3><p>개발자/오너 전용 명령어는 제외하고 일반 기능 명령어만 제어해요.</p></section>
    <div class="command-list dense">
      ${commandList.map((cmd) => {
        const enabled = !disabled.has(cmd.name);
        return `<article class="command-card"><div><h4>/${esc(cmd.name)}</h4><p>${esc(cmd.description)}</p><small>${esc(cmd.group)}${cmd.heart ? ' · 프리미엄 하트' : ''}</small></div><label class="switch"><input type="checkbox" data-command="${esc(cmd.name)}" ${enabled ? 'checked' : ''}><span></span></label></article>`;
      }).join('')}
    </div>
    <div class="form-actions"><button class="primary-btn" data-action="save-commands" type="button">명령어 설정 저장</button></div>
  `;
}

function renderTts() {
  const tts = state.settings.tts || defaultSettings.tts;
  return `
    <section class="section-title"><h3>TTS 관리</h3><p>대시보드에서 카테고리, 전용 채팅방, 음성방, 목소리를 관리해요.</p></section>
    <div class="form-grid">
      <label class="check-line"><input type="checkbox" id="ttsEnabled" ${tts.enabled ? 'checked' : ''}> TTS 켜기</label>
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
    <section class="section-title"><h3>이모지 업스케일</h3><p>반응 채널을 비워두면 모든 채널에서 이모지를 확장해요. 특정 채널에만 쓰고 싶을 때만 채널을 선택하세요.</p></section>
    <div class="form-grid">
      <label class="check-line"><input type="checkbox" id="emojiEnabled" ${emoji.enabled ? 'checked' : ''}> 이모지 업스케일 켜기</label>
      <label>반응 채널<select id="emojiChannel">${optionList('text', emoji.channelId, '모든 채널에서 자동 반응')}</select></label>
      <label>웹훅 표시 이름<input id="emojiWebhookName" value="${esc(emoji.webhookName || 'Natsumi Emoji Upscaler')}" /></label>
    </div>
    <div class="form-actions"><button class="primary-btn" data-action="save-emoji" type="button">이모지 설정 저장</button></div>
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

function featureName(key) {
  return ({ level: '레벨/랭크', welcome: '환영인사', ticket: '티켓', tts: 'TTS', ai: 'AI', shop: '웹상점', emojiUpscale: '이모지 업스케일' })[key] || key;
}

function featureDesc(key) {
  return ({
    level: '랭크카드와 경험치 표시를 제어해요.',
    welcome: '입장과 퇴장 카드를 제어해요.',
    ticket: '티켓 설정 기능을 제어해요.',
    tts: '채팅을 음성으로 읽는 기능을 제어해요.',
    ai: 'AI 채팅과 그림 기능을 제어해요.',
    shop: '웹상점과 후원 보상 기능을 제어해요.',
    emojiUpscale: '웹훅 이모지 확대 기능을 제어해요.',
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
  } catch {
    state.loggedIn = false;
    state.profile = null;
    state.isOwner = false;
  }
}

async function loadGuilds() {
  if (!state.isOwner) {
    state.guilds = [];
    state.selectedGuild = null;
    return;
  }
  try {
    const data = await api('/api/dashboard/guilds');
    state.guilds = data.guilds?.length ? data.guilds : fallbackGuilds;
  } catch {
    state.guilds = fallbackGuilds;
  }
  const saved = localStorage.getItem(selectedGuildKey);
  state.selectedGuild = state.guilds.find((guild) => guild.id === saved) || state.guilds[0];
}

async function loadSettings() {
  if (!state.isOwner) {
    state.settings = structuredClone(defaultSettings);
    return;
  }
  const guild = currentGuild();
  try {
    const data = await api(`/api/dashboard/guilds/${guild.id}/settings`);
    state.settings = { ...structuredClone(defaultSettings), ...(data.settings || data) };
  } catch {
    const saved = localStorage.getItem(localKey(guild.id));
    state.settings = saved ? { ...structuredClone(defaultSettings), ...JSON.parse(saved) } : structuredClone(defaultSettings);
  }
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
    state.botStatus = await api('/api/bot-status');
  } catch {
    state.botStatus = { apiOk: false };
  }
}

function formValue(selector) {
  return document.querySelector(selector)?.value?.trim() || '';
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
  if (state.activeTab === 'tts') {
    next.tts = {
      ...next.tts,
      enabled: document.querySelector('#ttsEnabled')?.checked || false,
      categoryId: formValue('#ttsCategory'),
      textChannelId: formValue('#ttsText'),
      voiceChannelId: formValue('#ttsVoiceChannel'),
      voice: formValue('#ttsVoice') || 'ko_warm_female',
    };
  }
  if (state.activeTab === 'emoji') {
    next.emojiUpscale = {
      ...next.emojiUpscale,
      enabled: document.querySelector('#emojiEnabled')?.checked || false,
      channelId: formValue('#emojiChannel'),
      webhookName: formValue('#emojiWebhookName') || 'Natsumi Emoji Upscaler',
    };
  }
  return next;
}

async function saveSettings() {
  if (!state.isOwner) return publicNoticePage();
  const guild = currentGuild();
  const settings = collectSettingsFromDom();
  state.settings = settings;
  localStorage.setItem(localKey(guild.id), JSON.stringify(settings));
  try {
    await api(`/api/dashboard/guilds/${guild.id}/settings`, { method: 'PATCH', body: JSON.stringify({ settings }) });
    toast('저장했어. 봇에 반영될 거야.');
  } catch {
    toast('API 연결 전이라 브라우저에 임시 저장했어.');
  }
}

async function sendWelcomeTest() {
  await saveSettings();
  try {
    await api(`/api/dashboard/guilds/${currentGuild().id}/welcome/test`, { method: 'POST', body: JSON.stringify({ settings: state.settings }) });
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

  if (target.dataset.action === 'home') return state.isOwner ? dashboard() : publicNoticePage();
  if (target.dataset.action === 'login') return login();
  if (target.dataset.action === 'refresh-public') {
    await Promise.all([loadSession(), loadDeveloperAnnouncements(), loadBotStatus()]);
    return state.isOwner ? dashboard() : publicNoticePage();
  }
  if (target.dataset.action === 'owner-dashboard') return state.isOwner ? dashboard() : publicNoticePage();
  if (!state.isOwner) return publicNoticePage();
  if (target.dataset.action === 'refresh') {
    await Promise.all([loadSession(), loadGuilds(), loadDeveloperAnnouncements(), loadBotStatus()]);
    await loadSettings();
    return dashboard();
  }
  if (target.dataset.tab) {
    state.activeTab = target.dataset.tab;
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
});

app.addEventListener('change', async (event) => {
  if (event.target.matches('[data-action="theme-toggle"]')) {
    applyTheme(event.target.checked ? 'dark' : 'light');
    return state.isOwner ? dashboard() : publicNoticePage();
  }
  if (event.target.id === 'guildSelect' && state.isOwner) {
    state.selectedGuild = state.guilds.find((guild) => guild.id === event.target.value) || state.guilds[0];
    localStorage.setItem(selectedGuildKey, state.selectedGuild.id);
    await loadSettings();
    dashboard();
  }
});

applyTheme();
await Promise.all([loadSession(), loadDeveloperAnnouncements(), loadBotStatus()]);
if (state.isOwner) {
  await loadGuilds();
  await loadSettings();
  dashboard();
} else {
  publicNoticePage();
}
