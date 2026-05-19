import './style.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://natsumi-game.kro.kr';
const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL || 'https://haruki7777.github.io/natsumi-dashboard/';
const themeKey = 'natsumi-dashboard-theme';
const selectedGuildKey = 'natsumi-dashboard-selected-guild';

const app = document.getElementById('app');

const welcomeVariables = [
  '{user}', '{user.name}', '{user.tag}', '{user.id}', '{user.mention}',
  '{server}', '{server.name}', '{server.id}', '{server.count}', '{member.count}',
  '{account.created}', '{joined.at}', '{owner.id}', '{random.welcome}',
];

const sampleTemplates = [
  ['포근한 첫인사', '{user.mention} 어서 와! {server.name}의 {member.count}번째 별이 되어줘서 고마워.'],
  ['랭크카드 느낌', '환영해, {user.name}! 프로필 카드를 준비했어. {server.name}에서 천천히 둘러봐.'],
  ['관리 서버용', '{user.mention} 님이 입장했어요. 규칙을 확인하고 즐거운 시간 보내주세요.'],
  ['친근한 말투', '{random.welcome} {user.name}! 기다리고 있었어.'],
  ['AI 프롬프트용', '새 멤버 {user.name}에게 짧고 따뜻한 애니풍 환영 인사를 만들어줘.'],
  ['게임센터풍', 'PRESS START, {user.name}! {server.name} 모험이 시작됐어.'],
  ['차분한 안내', '{user.mention} 님, 환영합니다. 필요한 안내는 공지 채널에서 확인해주세요.'],
  ['친구 초대풍', '{user.name} 왔다! 다들 반겨줘. 지금 멤버는 {server.count}명이야.'],
  ['프리미엄 하트', '{user.mention} 환영해! 일부 기능은 프리미엄 하트 인증 후 사용할 수 있어.'],
  ['짧은 문구', '{user.mention} 환영해!'],
  ['퇴장 회수용', '{user.name} 님의 입장 카드는 퇴장하면 자동 정리돼요.'],
];

const commandList = [
  { name: '랭크', description: '레벨과 랭크카드를 보여줘요.' },
  { name: '유저정보', description: '유저 정보와 배너를 확인해요.' },
  { name: 'sfw', description: '안전한 이미지 메뉴를 열어요.', heart: true },
  { name: '애니짤', description: '애니 이미지 메뉴를 열어요.', heart: true },
  { name: 'nsfw', description: 'NSFW 이미지 메뉴를 열어요.', heart: true },
  { name: '나츠미서버셋업', description: '서버 전용 채널을 구성해요.', heart: true },
  { name: '청소', description: '메시지를 정리해요.' },
  { name: '킥', description: '멤버를 추방해요.' },
  { name: '밴', description: '멤버를 차단해요.' },
  { name: '타임아웃', description: '멤버를 시간 제한해요.' },
  { name: 'tts설정', description: '대시보드 전용 관리로 전환 권장.' },
];

const fallbackGuilds = [
  {
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
  },
];

const defaultSettings = {
  disabledCommands: [],
  features: { welcome: false, notice: true, ticket: true, tts: false, ai: true, shop: true, emojiUpscale: false },
  welcome: {
    enabled: false,
    channelId: '',
    leaveChannelId: '',
    cleanupOnLeave: true,
    message: '어서 와, {user.mention}! {server.name}에 온 걸 환영해.',
    aiPrompt: '',
    templates: sampleTemplates.slice(0, 3).map(([name, message]) => ({ name, message })),
  },
  notice: { enabled: true, channelId: '', message: '' },
  tts: { enabled: false, categoryId: '', textChannelId: '', voiceChannelId: '', voice: 'ko_warm_female' },
  emojiUpscale: { enabled: false, channelId: '', webhookName: 'Natsumi Emoji Upscaler' },
};

const state = {
  theme: localStorage.getItem(themeKey) || 'dark',
  loggedIn: false,
  profile: null,
  guilds: [],
  selectedGuild: null,
  settings: structuredClone(defaultSettings),
  activeTab: 'overview',
  busy: false,
  notice: '',
};

const localKey = (guildId) => `natsumi-dashboard-settings-${guildId}`;
const esc = (value = '') => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const formValue = (selector) => document.querySelector(selector)?.value?.trim() || '';
const currentGuild = () => state.selectedGuild || state.guilds[0] || fallbackGuilds[0];
const channels = (type) => (currentGuild()?.channels || fallbackGuilds[0].channels).filter((channel) => !type || channel.type === type);

function normalizeChannelType(type) {
  if (type === 0 || type === 'GUILD_TEXT' || type === 'GuildText') return 'text';
  if (type === 2 || type === 'GUILD_VOICE' || type === 'GuildVoice') return 'voice';
  if (type === 4 || type === 'GUILD_CATEGORY' || type === 'GuildCategory') return 'category';
  return type || 'text';
}

function normalizeGuild(guild) {
  return {
    ...guild,
    channels: (guild.channels || []).map((channel) => ({
      ...channel,
      type: normalizeChannelType(channel.type),
    })),
  };
}

function applyTheme(theme = state.theme) {
  state.theme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = state.theme;
  localStorage.setItem(themeKey, state.theme);
}

function optionList(type, selected) {
  return [
    '<option value="">선택 안 함</option>',
    ...channels(type).map((channel) => `<option value="${esc(channel.id)}" ${channel.id === selected ? 'selected' : ''}># ${esc(channel.name)}</option>`),
  ].join('');
}

function voiceOptions(selected) {
  const voices = [
    ['ko_warm_female', '한국어 여성 - 포근한 안내'],
    ['ko_bright_girl', '한국어 여성 - 밝은 애니톤'],
    ['ko_soft_narrator', '한국어 여성 - 차분한 나레이션'],
    ['ko_youthful', '한국어 소녀 - 경쾌한 말투'],
    ['ko_default', '한국어 기본 - 안정적인 목소리'],
    ['ja_anime_girl', '일본어 여성 - 애니 캐릭터'],
    ['ja_soft_female', '일본어 여성 - 부드러운 톤'],
    ['ja_energy_girl', '일본어 소녀 - 활기찬 톤'],
    ['ja_narrator', '일본어 기본 - 나레이션'],
    ['ja_default', '일본어 기본 - 안정적인 목소리'],
  ];
  return voices.map(([value, label]) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${label}</option>`).join('');
}

function shell(content) {
  const loginLabel = state.loggedIn ? esc(state.profile?.username || '로그인됨') : 'Discord 로그인';
  return `
    <div class="page-shell">
      <header class="topbar glass">
        <button class="brand" data-action="home" type="button"><span>N</span><b>NATSUMI</b></button>
        <div class="top-actions">
          <a class="ghost-link" href="${DASHBOARD_URL}" target="_blank" rel="noreferrer">대시보드 링크</a>
          <button class="ghost-btn" data-action="theme" type="button">${state.theme === 'light' ? '다크 모드' : '화이트 모드'}</button>
          ${state.loggedIn ? `<span class="login-pill">${loginLabel}</span>` : `<button class="primary-btn" data-action="login" type="button">${loginLabel}</button>`}
        </div>
      </header>
      ${content}
      <footer class="footer glass">
        <b>나츠미 대시보드</b>
        <small>환영인사, 공지, 명령어 차단, TTS 설정을 서버별로 관리해요.</small>
      </footer>
    </div>
  `;
}

function intro() {
  app.innerHTML = shell(`
    <section class="hero glass">
      <p class="eyebrow">Natsumi Server Console</p>
      <h1>서버 설정을 한눈에 보고<br>나츠미를 원하는 방식으로 켜요</h1>
      <p class="hero-desc">Discord 로그인 후 관리 가능한 서버를 선택하면 환영 카드, 공지, 명령어 ON/OFF, TTS 카테고리를 대시보드에서만 설정할 수 있어요.</p>
      <div class="hero-actions">
        <button class="primary-btn" data-action="login" type="button">Discord로 시작</button>
        <button class="soft-btn" data-action="preview" type="button">미리보기</button>
      </div>
      <div class="stats-strip">
        <article><span>설정 방식</span><b>대시보드 전용</b></article>
        <article><span>환영 카드</span><b>프로필 포함</b></article>
        <article><span>명령어 차단</span><b>서버별 적용</b></article>
      </div>
    </section>
  `);
}

function dashboard() {
  const guild = currentGuild();
  app.innerHTML = shell(`
    <div class="dashboard-shell">
      <aside class="sidebar glass">
        <div class="profile-mini">
          <div class="avatar">${state.profile?.avatar ? `<img src="${esc(state.profile.avatar)}" alt="" />` : 'N'}</div>
          <div><b>${state.profile ? esc(state.profile.username) : '나츠미 관리자'}</b><small>${state.loggedIn ? 'Discord 로그인됨' : '미리보기 모드'}</small></div>
        </div>
        <label class="select-label">서버 선택</label>
        <select class="wide-select" id="guildSelect">${state.guilds.map((g) => `<option value="${esc(g.id)}" ${g.id === guild.id ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select>
        ${[
          ['overview', '한눈에 보기'],
          ['settings', '내 설정'],
          ['welcome', '환영인사'],
          ['notice', '공지 보내기'],
          ['commands', '명령어 켜고 끄기'],
          ['tts', 'TTS 관리'],
          ['emoji', '이모지 업스케일'],
          ['qna', '질문답변'],
        ].map(([tab, label]) => `<button class="nav ${state.activeTab === tab ? 'active' : ''}" data-tab="${tab}" type="button">${label}</button>`).join('')}
      </aside>
      <main class="main glass">
        <header class="main-head">
          <div>
            <p class="eyebrow">선택된 서버</p>
            <h2>${esc(guild.name)}</h2>
          </div>
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
  if (state.activeTab === 'notice') return renderNotice();
  if (state.activeTab === 'commands') return renderCommands();
  if (state.activeTab === 'tts') return renderTts();
  if (state.activeTab === 'emoji') return renderEmoji();
  if (state.activeTab === 'qna') return renderQna();
  return renderOverview();
}

function renderOverview() {
  const guild = currentGuild();
  const featureEntries = Object.entries(state.settings.features || {});
  return `
    <section class="section-title">
      <h3>한눈에 보기</h3>
      <p>나츠미가 들어가 있는 서버와 현재 켜진 기능을 빠르게 확인해요.</p>
    </section>
    <div class="stat-row">
      <article><span>관리 가능 서버</span><b>${state.guilds.length}</b></article>
      <article><span>채널 수</span><b>${channels().length}</b></article>
      <article><span>꺼진 명령어</span><b>${state.settings.disabledCommands?.length || 0}</b></article>
    </div>
    <div class="server-grid">
      <article class="server-card static-card"><div class="server-icon">N</div><div><b>${esc(guild.name)}</b><small>${guild.manageable === false ? '권한 확인 필요' : '관리 가능'}</small></div></article>
      ${featureEntries.map(([key, value]) => `<article class="mini-card"><span>${featureName(key)}</span><b>${value ? '켜짐' : '꺼짐'}</b></article>`).join('')}
    </div>
  `;
}

function renderSettings() {
  const features = state.settings.features || {};
  return `
    <section class="section-title"><h3>내 설정</h3><p>서버 기능을 전체적으로 켜고 끄는 홈이에요.</p></section>
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
    <section class="section-title">
      <h3>환영인사</h3>
      <p>설정하지 않으면 아무 메시지도 튀어나오지 않게 막아뒀어요. 켜면 입장/퇴장 카드가 프로필과 함께 전송돼요.</p>
    </section>
    <div class="form-grid">
      <label class="check-line"><input type="checkbox" id="welcomeEnabled" ${welcome.enabled ? 'checked' : ''}> 환영인사 켜기</label>
      <label class="check-line"><input type="checkbox" id="cleanupOnLeave" ${welcome.cleanupOnLeave !== false ? 'checked' : ''}> 멤버가 나가면 기존 환영 메시지 회수</label>
      <label>환영 채널<select id="welcomeChannel">${optionList('text', welcome.channelId)}</select></label>
      <label>퇴장 카드 채널<select id="leaveChannel">${optionList('text', welcome.leaveChannelId || welcome.channelId)}</select></label>
      <label>AI 환영 프롬프트<textarea id="aiPrompt" placeholder="예: 새 멤버에게 짧고 따뜻한 애니풍 환영 인사를 만들어줘.">${esc(welcome.aiPrompt || '')}</textarea></label>
      <label>고정 메시지<textarea id="welcomeMessage" placeholder="변수를 넣어 환영 문구를 적어줘.">${esc(welcome.message || '')}</textarea></label>
    </div>
    <section class="tool-card">
      <h4>변수 삽입</h4>
      <div class="chip-grid">${welcomeVariables.map((v) => `<button class="chip" data-insert="${esc(v)}" type="button">${esc(v)}</button>`).join('')}</div>
    </section>
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

function renderNotice() {
  const notice = state.settings.notice || defaultSettings.notice;
  return `
    <section class="section-title"><h3>공지 보내기</h3><p>대시보드에서 작성한 공지를 선택한 채널로 전송해요.</p></section>
    <div class="form-grid">
      <label class="check-line"><input type="checkbox" id="noticeEnabled" ${notice.enabled !== false ? 'checked' : ''}> 공지 기능 켜기</label>
      <label>공지 채널<select id="noticeChannel">${optionList('text', notice.channelId)}</select></label>
      <label>공지 내용<textarea id="noticeMessage" placeholder="공지할 내용을 적어줘.">${esc(notice.message || '')}</textarea></label>
    </div>
    <div class="form-actions">
      <button class="soft-btn" data-action="save-notice" type="button">설정 저장</button>
      <button class="primary-btn" data-action="send-notice" type="button">공지 전송</button>
    </div>
  `;
}

function renderCommands() {
  const disabled = new Set(state.settings.disabledCommands || []);
  return `
    <section class="section-title"><h3>명령어 켜고 끄기</h3><p>끄면 봇이 해당 서버에서 바로 “대시보드에서 꺼진 명령어”라고 안내하고 실행하지 않아요.</p></section>
    <div class="command-list">
      ${commandList.map((cmd) => {
        const enabled = !disabled.has(cmd.name);
        return `
          <article class="command-card">
            <div><h4>/${esc(cmd.name)}</h4><p>${esc(cmd.description)}</p>${cmd.heart ? '<span class="heart-chip">프리미엄 하트</span>' : ''}</div>
            <label class="switch"><input type="checkbox" data-command="${esc(cmd.name)}" ${enabled ? 'checked' : ''}><span></span></label>
          </article>
        `;
      }).join('')}
    </div>
    <div class="form-actions"><button class="primary-btn" data-action="save-commands" type="button">명령어 설정 저장</button></div>
  `;
}

function renderTts() {
  const tts = state.settings.tts || defaultSettings.tts;
  return `
    <section class="section-title"><h3>TTS 관리</h3><p>봇 명령어 대신 대시보드에서 카테고리, 전용 채팅방, 음성방, 목소리를 관리해요.</p></section>
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
    <section class="section-title"><h3>이모지 업스케일</h3><p>기본은 항상 꺼짐이에요. 관리자가 켠 채널에서만 이미지/이모지 확대 웹훅이 반응하고, 임시 웹훅은 처리 후 정리하도록 봇 설정에 저장해요.</p></section>
    <div class="form-grid">
      <label class="check-line"><input type="checkbox" id="emojiEnabled" ${emoji.enabled ? 'checked' : ''}> 이모지 업스케일 켜기</label>
      <label>반응 채널<select id="emojiChannel">${optionList('text', emoji.channelId)}</select></label>
      <label>웹훅 표시 이름<input id="emojiWebhookName" value="${esc(emoji.webhookName || 'Natsumi Emoji Upscaler')}" /></label>
    </div>
    <div class="form-actions"><button class="primary-btn" data-action="save-emoji" type="button">이모지 설정 저장</button></div>
  `;
}

function renderQna() {
  return `
    <section class="section-title"><h3>질문답변</h3><p>사용자는 질문을 남기고, 개발자는 답변을 달 수 있어요. 공지처럼 패널 형태로 보이게 백엔드에 저장돼요.</p></section>
    <div class="form-grid">
      <label>질문 작성<textarea id="questionText" placeholder="궁금한 내용을 적어줘."></textarea></label>
    </div>
    <div class="form-actions">
      <button class="soft-btn" data-action="load-qna" type="button">질문 목록 불러오기</button>
      <button class="primary-btn" data-action="send-question" type="button">질문 보내기</button>
    </div>
    <div id="qnaList" class="command-list"></div>
  `;
}

function featureName(key) {
  return ({ welcome: '환영인사', notice: '공지', ticket: '문의', tts: 'TTS', ai: 'AI 채팅', shop: '웹상점', emojiUpscale: '이모지 업스케일' })[key] || key;
}

function featureDesc(key) {
  return ({
    welcome: '입장/퇴장 카드와 환영 메시지를 관리해요.',
    notice: '대시보드 공지 전송을 허용해요.',
    ticket: '문의 채널과 로그 기능을 허용해요.',
    tts: '전용 채팅방에 쓴 글을 음성 채널에서 읽어요.',
    ai: 'AI 채팅과 그림공방을 허용해요.',
    shop: '웹상점과 후원 보상을 허용해요.',
    emojiUpscale: '설정한 채널에서만 이미지/이모지 업스케일 반응을 허용해요.',
  })[key] || '서버 기능을 켜거나 꺼요.';
}

function collectSettingsFromDom(scope) {
  const next = structuredClone(state.settings);
  if (scope === 'settings') {
    document.querySelectorAll('[data-feature]').forEach((input) => {
      next.features[input.dataset.feature] = input.checked;
    });
  }
  if (scope === 'welcome') {
    next.features.welcome = document.querySelector('#welcomeEnabled')?.checked || false;
    next.welcome = {
      ...next.welcome,
      enabled: next.features.welcome,
      cleanupOnLeave: document.querySelector('#cleanupOnLeave')?.checked !== false,
      channelId: formValue('#welcomeChannel'),
      leaveChannelId: formValue('#leaveChannel'),
      aiPrompt: formValue('#aiPrompt'),
      message: formValue('#welcomeMessage'),
    };
  }
  if (scope === 'notice') {
    next.features.notice = document.querySelector('#noticeEnabled')?.checked !== false;
    next.notice = { ...next.notice, enabled: next.features.notice, channelId: formValue('#noticeChannel'), message: formValue('#noticeMessage') };
  }
  if (scope === 'commands') {
    const disabled = [];
    document.querySelectorAll('[data-command]').forEach((input) => {
      if (!input.checked) disabled.push(input.dataset.command);
    });
    next.disabledCommands = disabled;
  }
  if (scope === 'tts') {
    next.features.tts = document.querySelector('#ttsEnabled')?.checked || false;
    next.tts = {
      enabled: next.features.tts,
      categoryId: formValue('#ttsCategory'),
      textChannelId: formValue('#ttsText'),
      voiceChannelId: formValue('#ttsVoiceChannel'),
      voice: formValue('#ttsVoice'),
    };
  }
  if (scope === 'emoji') {
    next.features.emojiUpscale = document.querySelector('#emojiEnabled')?.checked || false;
    next.emojiUpscale = {
      enabled: next.features.emojiUpscale,
      channelId: formValue('#emojiChannel'),
      webhookName: formValue('#emojiWebhookName') || 'Natsumi Emoji Upscaler',
    };
  }
  state.settings = next;
  return next;
}

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json().catch(() => ({}));
}

async function loadSession() {
  try {
    const data = await api('/api/dashboard/session');
    state.loggedIn = Boolean(data.user);
    state.profile = data.user || null;
  } catch {
    state.loggedIn = false;
    state.profile = null;
  }
}

async function loadGuilds() {
  try {
    const data = await api('/api/dashboard/guilds');
    state.guilds = data.guilds?.length ? data.guilds.map(normalizeGuild) : fallbackGuilds;
  } catch {
    state.guilds = fallbackGuilds;
  }
  const savedId = localStorage.getItem(selectedGuildKey);
  state.selectedGuild = state.guilds.find((guild) => guild.id === savedId) || state.guilds[0];
}

async function loadSettings() {
  const guild = currentGuild();
  try {
    const data = await api(`/api/dashboard/guilds/${guild.id}/settings`);
    state.settings = { ...structuredClone(defaultSettings), ...(data.settings || data) };
  } catch {
    const saved = localStorage.getItem(localKey(guild.id));
    state.settings = saved ? { ...structuredClone(defaultSettings), ...JSON.parse(saved) } : structuredClone(defaultSettings);
  }
}

async function saveSettings(scope) {
  const guild = currentGuild();
  const settings = collectSettingsFromDom(scope);
  localStorage.setItem(localKey(guild.id), JSON.stringify(settings));
  try {
    await api(`/api/dashboard/guilds/${guild.id}/settings`, { method: 'PATCH', body: JSON.stringify({ settings }) });
    toast('저장했어. 봇에도 반영될 거야.');
  } catch {
    toast('API가 아직 연결되지 않아 브라우저에 임시 저장했어.');
  }
}

async function sendWelcomeTest() {
  await saveSettings('welcome');
  try {
    await api(`/api/dashboard/guilds/${currentGuild().id}/welcome/test`, { method: 'POST', body: JSON.stringify({ settings: state.settings }) });
    toast('테스트 환영 메시지를 보냈어.');
  } catch {
    toast('테스트 API가 아직 준비되지 않았어. 설정 저장은 완료했어.');
  }
}

async function sendNotice() {
  await saveSettings('notice');
  try {
    await api(`/api/dashboard/guilds/${currentGuild().id}/notice`, { method: 'POST', body: JSON.stringify({ notice: state.settings.notice }) });
    toast('공지 전송 요청을 보냈어.');
  } catch {
    toast('공지 API가 아직 준비되지 않았어. 설정 저장은 완료했어.');
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
    toast('질문 API가 아직 준비되지 않았거나 로그인이 필요해.');
  }
}

async function loadQuestions() {
  const list = document.querySelector('#qnaList');
  if (!list) return;
  try {
    const data = await api(`/api/dashboard/guilds/${currentGuild().id}/questions`);
    const rows = data.questions || [];
    list.innerHTML = rows.map((row) => `
      <article class="command-card">
        <div>
          <h4>${esc(row.username || row.userId || '질문자')}</h4>
          <p>${esc(row.question)}</p>
          ${row.answer ? `<span class="heart-chip">답변: ${esc(row.answer)}</span>` : '<span class="heart-chip">답변 대기</span>'}
        </div>
      </article>
    `).join('') || '<p class="empty">아직 질문이 없어.</p>';
  } catch {
    list.innerHTML = '<p class="empty">질문 목록을 불러오지 못했어.</p>';
  }
}

function toast(message) {
  state.notice = message;
  const old = document.querySelector('.toast');
  old?.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function login() {
  const returnTo = encodeURIComponent(window.location.href);
  window.location.href = `${API_BASE}/api/auth/discord?returnTo=${returnTo}`;
}

app.addEventListener('click', async (event) => {
  const target = event.target.closest('button');
  if (!target) return;

  if (target.dataset.action === 'home') return state.guilds.length ? dashboard() : intro();
  if (target.dataset.action === 'theme') {
    applyTheme(state.theme === 'light' ? 'dark' : 'light');
    return state.guilds.length ? dashboard() : intro();
  }
  if (target.dataset.action === 'login') return login();
  if (target.dataset.action === 'preview') {
    state.guilds = fallbackGuilds;
    state.selectedGuild = fallbackGuilds[0];
    state.loggedIn = false;
    await loadSettings();
    return dashboard();
  }
  if (target.dataset.action === 'refresh') {
    await Promise.all([loadSession(), loadGuilds()]);
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
  if (target.dataset.action === 'save-settings') return saveSettings('settings');
  if (target.dataset.action === 'save-welcome') return saveSettings('welcome');
  if (target.dataset.action === 'test-welcome') return sendWelcomeTest();
  if (target.dataset.action === 'save-notice') return saveSettings('notice');
  if (target.dataset.action === 'send-notice') return sendNotice();
  if (target.dataset.action === 'save-commands') return saveSettings('commands');
  if (target.dataset.action === 'save-tts') return saveSettings('tts');
  if (target.dataset.action === 'save-emoji') return saveSettings('emoji');
  if (target.dataset.action === 'send-question') return sendQuestion();
  if (target.dataset.action === 'load-qna') return loadQuestions();
});

app.addEventListener('change', async (event) => {
  if (event.target.id === 'guildSelect') {
    state.selectedGuild = state.guilds.find((guild) => guild.id === event.target.value) || state.guilds[0];
    localStorage.setItem(selectedGuildKey, state.selectedGuild.id);
    await loadSettings();
    dashboard();
  }
});

applyTheme();
await loadSession();
await loadGuilds();
await loadSettings();
if (state.loggedIn || state.guilds.length) dashboard();
else intro();
