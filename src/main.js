import './style.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://natsumi-site.kro.kr';

const state = {
  servers: [],
  selectedGuild: null,
  commands: [],
};

const app = document.getElementById('app');

const defaultCommands = [
  { name: '티켓', description: '문의 티켓 패널과 로그 채널을 관리해요.', enabled: true, heart: false },
  { name: '공지', description: '서버 공지를 깔끔하게 전송해요.', enabled: true, heart: false },
  { name: '환영인사', description: '새 멤버에게 보낼 환영 메시지를 설정해요.', enabled: true, heart: false },
  { name: 'sfw', description: '안전한 애니 이미지를 불러와요.', enabled: true, heart: true },
  { name: '애니짤', description: '애니 짤 이미지를 불러와요.', enabled: true, heart: true },
  { name: 'nsfw', description: 'NSFW 전용 채널에서만 사용할 수 있어요.', enabled: true, heart: true },
  { name: 'rank', description: '서버 레벨 랭킹 카드를 보여줘요.', enabled: true, heart: false },
];

function viewIntro() {
  app.innerHTML = `
    <div class="hero-shell">
      <nav class="topbar glass">
        <div class="brand"><span>🌸</span><b>NATSUMI</b></div>
        <button class="ghost-btn" data-action="login">Discord 로그인</button>
      </nav>

      <section class="hero glass">
        <p class="eyebrow">AI Discord Bot Dashboard</p>
        <h1>나츠미 서버 관리를<br/>더 가볍고 예쁘게.</h1>
        <p class="hero-desc">
          티켓, 공지, 환영인사, 명령어 ON/OFF를 한 곳에서 관리해요.
          관리자 권한이 있는 서버만 보여주고, 프리미엄 하트가 필요한 기능도 따로 표시해요.
        </p>
        <div class="hero-actions">
          <button class="primary-btn" data-action="login">Discord로 시작</button>
          <button class="soft-btn" data-action="preview">미리보기</button>
        </div>
        <div class="hero-badges">
          <span>하트 인증 보호</span><span>관리자 서버 필터</span><span>모바일 최적화</span>
        </div>
      </section>
    </div>
  `;
}

function viewDashboard() {
  app.innerHTML = `
    <div class="dashboard-shell">
      <aside class="sidebar glass">
        <div class="profile-mini">
          <div class="avatar">🌸</div>
          <div><b>나츠미</b><small>Dashboard</small></div>
        </div>
        <button class="nav active" data-tab="servers">서버 목록</button>
        <button class="nav" data-tab="commands">명령어</button>
        <button class="nav" data-tab="welcome">환영인사</button>
        <button class="nav" data-tab="notice">공지</button>
        <button class="nav" data-tab="ticket">티켓</button>
      </aside>

      <main class="main glass">
        <header class="main-head">
          <div>
            <p class="eyebrow">관리 가능한 서버</p>
            <h2>${state.selectedGuild ? state.selectedGuild.name : '서버를 선택해줘'}</h2>
          </div>
          <button class="soft-btn" data-action="refresh">새로고침</button>
        </header>
        <div id="panel"></div>
      </main>
    </div>
  `;
  renderServers();
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
      <p>로그인 후에는 내가 들어가 있고 관리자 권한이 있는 서버만 표시돼요.</p>
    </section>
    <div class="server-grid">
      ${servers.map((guild) => `
        <button class="server-card" data-guild="${guild.id}" data-name="${guild.name}">
          <div class="server-icon">${guild.icon ? `<img src="${guild.icon}" alt="" />` : '🌸'}</div>
          <div><b>${guild.name}</b><small>${guild.manageable === false ? '권한 없음' : '관리 가능'}</small></div>
        </button>
      `).join('')}
    </div>
  `;
}

function renderCommands() {
  const panel = document.getElementById('panel');
  const commandsRaw = state.commands.length ? state.commands : defaultCommands;
  const commands = commandsRaw.filter((cmd) => {
    const raw = String(cmd?.name ?? '');
    const lower = raw.toLowerCase();
    return raw !== '도움말' && lower !== 'help';
  });
  panel.innerHTML = `
    <section class="section-title">
      <h3>사용 가능한 명령어</h3>
      <p>서버별로 명령어를 켜고 끌 수 있어요. 하트 표시 명령어는 한디리 프리미엄 하트 인증 후 사용할 수 있어요.</p>
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
    notice: ['공지 시스템', '대시보드에서 공지 내용을 작성하고 지정한 채널로 전송해요.'],
    ticket: ['티켓 설정', '티켓 패널 채널, 로그 채널, 관리자 역할을 설정해요.'],
  };
  const [title, desc] = map[tab];
  document.getElementById('panel').innerHTML = `
    <section class="section-title"><h3>${title}</h3><p>${desc}</p></section>
    <div class="form-card">
      <label>채널 ID</label><input placeholder="채널 ID를 입력해줘" />
      <label>메시지</label><textarea placeholder="내용을 입력해줘"></textarea>
      <button class="primary-btn">저장하기</button>
    </div>
  `;
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

function login() {
  window.location.href = `${API_BASE}/api/auth/discord`;
}

app.addEventListener('click', async (event) => {
  const target = event.target.closest('button');
  if (!target) return;

  if (target.dataset.action === 'login') return login();
  if (target.dataset.action === 'preview') {
    await loadServers();
    viewDashboard();
    return;
  }
  if (target.dataset.action === 'refresh') {
    await loadServers();
    renderServers();
    return;
  }
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

viewIntro();
