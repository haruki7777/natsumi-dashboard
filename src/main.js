import './style.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://natsumi-site.kro.kr';
const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL || 'https://natsumi-site.kro.kr/natsumi-dashboard/';
const KOREANBOTS_BOT_ID = import.meta.env.VITE_KOREANBOTS_BOT_ID || '';
const themeKey = 'natsumi-dashboard-theme';

const state = {
  servers: [],
  selectedGuild: null,
  commands: [],
  stats: null,
  theme: localStorage.getItem(themeKey) || 'dark',
};

const app = document.getElementById('app');

const defaultCommands = [
  { name: '문의', description: '문의 패널과 로그 채널을 관리해요.', enabled: true, heart: false },
  { name: '공지', description: '서버 공지를 깔끔하게 전송해요.', enabled: true, heart: false },
  { name: '환영인사', description: '새 멤버에게 보낼 환영 메시지를 설정해요.', enabled: true, heart: true },
  { name: 'sfw', description: '안전한 애니 이미지를 불러와요.', enabled: true, heart: true },
  { name: '애니짤', description: '애니 이미지 카테고리를 선택해요.', enabled: true, heart: true },
  { name: 'nsfw', description: 'NSFW 전용 채널에서만 사용할 수 있어요.', enabled: true, heart: true },
  { name: '랭크', description: '서버 레벨과 랭크카드를 보여줘요.', enabled: true, heart: false },
];

const policies = {
  terms: {
    title: '이용약관',
    body: [
      '나츠미 대시보드는 Discord 서버 관리와 봇 설정을 돕기 위해 제공됩니다.',
      '사용자는 Discord 권한과 서버 규칙을 지켜야 하며, 자동화 기능을 악용해 타인에게 피해를 주면 이용이 제한될 수 있습니다.',
      '봇 명령어, 웹상점, 후원 보상은 서비스 안정성과 정책에 따라 변경될 수 있습니다.',
    ],
  },
  privacy: {
    title: '개인정보 처리방침',
    body: [
      'Discord 로그인 시 식별자, 사용자명, 아바타, 관리 가능한 서버 목록처럼 서비스 제공에 필요한 최소 정보만 사용합니다.',
      '서버 설정, 랭크, 금전, 칭호, 배지, 후원 신청 기록은 기능 제공과 장애 대응을 위해 저장될 수 있습니다.',
      '토큰, API 키, 결제 확인 자료 같은 민감 정보는 공개 화면에 표시하지 않으며 운영 확인 목적 외로 사용하지 않습니다.',
    ],
  },
  refund: {
    title: '환불정책',
    body: [
      '후원은 선입금 후 운영자 확인 방식으로 처리됩니다.',
      '선입금이 완료되어 후원 보상 지급 절차가 시작되었거나 지급된 결과는 환불할 수 없습니다.',
      '입금자명 오기재, 금액 불일치, 허위 인증은 실패 처리될 수 있으며 이 경우 관리자 문의를 통해 확인합니다.',
    ],
  },
  data: {
    title: '데이터정책',
    body: [
      '랭크, 경험치, 금전, 출석, 서버 설정 데이터는 봇 기능 유지를 위해 저장됩니다.',
      '불필요한 데이터는 요청 또는 서비스 정리 시 삭제할 수 있으며, 장애 복구를 위해 백업이 존재할 수 있습니다.',
      '서비스 운영에 필요한 API 제공자와 호스팅 환경 외의 제3자에게 데이터를 임의 판매하지 않습니다.',
    ],
  },
};

function applyTheme(theme = state.theme) {
  state.theme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = state.theme;
  localStorage.setItem(themeKey, state.theme);
}

function layout(content) {
  return `
    <div class="page-shell">
      <nav class="topbar glass">
        <button class="brand" data-action="home" type="button"><span>狐</span><b>NATSUMI</b></button>
        <div class="top-actions">
          <a class="ghost-link" href="${DASHBOARD_URL}" target="_blank" rel="noreferrer">대시보드 링크</a>
          <button class="ghost-btn" data-action="theme" type="button">${state.theme === 'light' ? '어두운 테마' : '밝은 테마'}</button>
          <button class="primary-btn" data-action="login" type="button">Discord 로그인</button>
        </div>
      </nav>
      ${content}
      ${footer()}
    </div>
  `;
}

function footer() {
  return `
    <footer class="footer glass">
      <b>NATSUMI 정책 안내</b>
      <div class="footer-links">
        <button data-policy="terms" type="button">이용약관</button>
        <button data-policy="privacy" type="button">개인정보 처리방침</button>
        <button data-policy="refund" type="button">환불정책</button>
        <button data-policy="data" type="button">데이터정책</button>
      </div>
      <small>후원 보상과 서버 데이터는 운영 확인 후 반영됩니다.</small>
    </footer>
  `;
}

function viewIntro() {
  app.innerHTML = layout(`
    <section class="hero glass">
      <p class="eyebrow">AI Discord Bot Dashboard</p>
      <h1>나츠미 서버 관리를<br>한 곳에서 정리해요</h1>
      <p class="hero-desc">
        명령어 ON/OFF, 서버 목록, 프리미엄 하트 기능, 정책 안내를 모바일과 PC에서 보기 좋게 관리할 수 있어요.
      </p>
      <div class="hero-actions">
        <button class="primary-btn" data-action="login" type="button">Discord로 시작</button>
        <button class="soft-btn" data-action="preview" type="button">미리보기</button>
      </div>
      <div class="stats-strip">
        <article><span>Discord 서버</span><b>${serverCountText()}</b></article>
        <article><span>한디리 동기화</span><b>${state.stats?.koreanbotsServers ?? '확인 중'}</b></article>
        <article><span>관리 화면</span><b>반응형</b></article>
      </div>
    </section>
  `);
}

function viewDashboard() {
  app.innerHTML = layout(`
    <div class="dashboard-shell">
      <aside class="sidebar glass">
        <div class="profile-mini"><div class="avatar">狐</div><div><b>나츠미</b><small>Dashboard</small></div></div>
        <button class="nav active" data-tab="servers" type="button">서버 목록</button>
        <button class="nav" data-tab="commands" type="button">명령어</button>
        <button class="nav" data-tab="welcome" type="button">환영인사</button>
        <button class="nav" data-tab="notice" type="button">공지</button>
        <button class="nav" data-tab="ticket" type="button">문의</button>
      </aside>
      <main class="main glass">
        <header class="main-head">
          <div>
            <p class="eyebrow">관리 가능한 서버</p>
            <h2>${state.selectedGuild ? state.selectedGuild.name : '서버를 선택해줘'}</h2>
          </div>
          <button class="soft-btn" data-action="refresh" type="button">새로고침</button>
        </header>
        <div id="panel"></div>
      </main>
    </div>
  `);
  renderServers();
}

function serverCountText() {
  const count = state.stats?.botServers ?? state.stats?.discordServers ?? state.servers.length;
  return count ? `${Number(count).toLocaleString('ko-KR')}개` : '확인 중';
}

function renderServers() {
  const panel = document.getElementById('panel');
  const servers = state.servers.length ? state.servers : [
    { id: 'demo-1', name: '나츠미 테스트 서버', icon: null, manageable: true },
    { id: 'demo-2', name: '관리자 권한 서버 예시', icon: null, manageable: true },
  ];

  panel.innerHTML = `
    <section class="section-title">
      <h3>서버 목록</h3>
      <p>Discord 로그인 후 관리 권한이 있는 서버만 표시돼요. 한디리 서버 수와 차이가 날 때는 봇 서버 수 동기화가 늦어진 상태일 수 있어요.</p>
    </section>
    <div class="stat-row">
      <article><span>대시보드 서버</span><b>${state.servers.length || '미리보기'}</b></article>
      <article><span>봇 서버 수</span><b>${serverCountText()}</b></article>
      <article><span>한디리 표시</span><b>${state.stats?.koreanbotsServers ?? '동기화 대기'}</b></article>
    </div>
    <div class="server-grid">
      ${servers.map((guild) => `
        <button class="server-card" data-guild="${guild.id}" data-name="${guild.name}" type="button">
          <div class="server-icon">${guild.icon ? `<img src="${guild.icon}" alt="" />` : '狐'}</div>
          <div><b>${guild.name}</b><small>${guild.manageable === false ? '권한 없음' : '관리 가능'}</small></div>
        </button>
      `).join('')}
    </div>
  `;
}

function renderCommands() {
  const panel = document.getElementById('panel');
  const commands = (state.commands.length ? state.commands : defaultCommands).filter((cmd) => {
    const name = String(cmd?.name ?? '').toLowerCase();
    return name !== 'help' && cmd?.name !== '마지막';
  });

  panel.innerHTML = `
    <section class="section-title">
      <h3>사용 가능한 명령어</h3>
      <p>하트 표시 명령어는 한디리 프리미엄 하트 인증 후 사용할 수 있어요.</p>
    </section>
    <div class="command-list">
      ${commands.map((cmd) => `
        <article class="command-card">
          <div>
            <h4>/${cmd.name}</h4>
            <p>${cmd.description}</p>
            ${cmd.heart ? '<span class="heart-chip">프리미엄 하트 필요</span>' : ''}
          </div>
          <label class="switch" aria-label="/${cmd.name} 사용 여부">
            <input type="checkbox" ${cmd.enabled ? 'checked' : ''} data-command="${cmd.name}">
            <span></span>
          </label>
        </article>
      `).join('')}
    </div>
  `;
}

function renderSimple(tab) {
  const map = {
    welcome: ['환영인사', '새 멤버가 들어왔을 때 보낼 메시지와 채널을 설정해요.'],
    notice: ['공지 시스템', '대시보드에서 공지 내용을 작성하고 지정 채널로 전송해요.'],
    ticket: ['문의 설정', '문의 패널 채널, 로그 채널, 관리자 역할을 설정해요.'],
  };
  const [title, desc] = map[tab];
  document.getElementById('panel').innerHTML = `
    <section class="section-title"><h3>${title}</h3><p>${desc}</p></section>
    <div class="form-card">
      <label>채널 ID</label><input placeholder="채널 ID를 입력해줘" />
      <label>메시지</label><textarea placeholder="내용을 입력해줘"></textarea>
      <button class="primary-btn" type="button">저장하기</button>
    </div>
  `;
}

function viewPolicy(key) {
  const policy = policies[key] || policies.terms;
  app.innerHTML = layout(`
    <main class="policy-page glass">
      <p class="eyebrow">NATSUMI POLICY</p>
      <h1>${policy.title}</h1>
      ${policy.body.map((text) => `<p>${text}</p>`).join('')}
      <div class="hero-actions">
        <button class="primary-btn" data-action="home" type="button">처음으로</button>
        <a class="soft-link" href="${DASHBOARD_URL}" target="_blank" rel="noreferrer">대시보드 열기</a>
      </div>
    </main>
  `);
}

async function loadServers() {
  try {
    const res = await fetch(`${API_BASE}/api/dashboard/guilds`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to load guilds');
    const data = await res.json();
    state.servers = data.guilds || [];
  } catch {
    state.servers = [];
  }
}

async function loadStats() {
  const candidates = [`${API_BASE}/api/dashboard/stats`, `${API_BASE}/api/stats`, `${API_BASE}/api/config`];
  for (const url of candidates) {
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) continue;
      const data = await res.json();
      state.stats = {
        botServers: data.guilds ?? data.guildCount ?? data.serverCount ?? data.botServers,
        discordServers: data.discordServers,
        koreanbotsServers: data.koreanbotsServers ?? data.koreanbotsGuilds ?? data.koreanbotsServerCount,
      };
      return;
    } catch {}
  }
  if (KOREANBOTS_BOT_ID) {
    try {
      const res = await fetch(`https://koreanbots.dev/api/v2/bots/${KOREANBOTS_BOT_ID}`);
      const data = await res.json();
      state.stats = { koreanbotsServers: data?.data?.servers ?? data?.servers };
    } catch {}
  }
}

function login() {
  window.location.href = `${API_BASE}/api/auth/discord`;
}

app.addEventListener('click', async (event) => {
  const target = event.target.closest('button');
  if (!target) return;

  if (target.dataset.action === 'home') return viewIntro();
  if (target.dataset.action === 'theme') {
    applyTheme(state.theme === 'light' ? 'dark' : 'light');
    return state.selectedGuild || document.querySelector('.dashboard-shell') ? viewDashboard() : viewIntro();
  }
  if (target.dataset.action === 'login') return login();
  if (target.dataset.action === 'preview') {
    await loadServers();
    viewDashboard();
    return;
  }
  if (target.dataset.action === 'refresh') {
    await Promise.all([loadServers(), loadStats()]);
    renderServers();
    return;
  }
  if (target.dataset.policy) return viewPolicy(target.dataset.policy);
  if (target.dataset.guild) {
    state.selectedGuild = { id: target.dataset.guild, name: target.dataset.name };
    viewDashboard();
    renderCommands();
    return;
  }
  if (target.dataset.tab) {
    document.querySelectorAll('.nav').forEach((item) => item.classList.remove('active'));
    target.classList.add('active');
    if (target.dataset.tab === 'servers') return renderServers();
    if (target.dataset.tab === 'commands') return renderCommands();
    return renderSimple(target.dataset.tab);
  }
});

applyTheme();
await loadStats();
viewIntro();
