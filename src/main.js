document.getElementById('app').innerHTML = `
<div class='layout'>
  <aside class='sidebar'>
    <h1>🦊 NATSUMI</h1>
    <button>🏠 홈</button>
    <button>🎫 티켓</button>
    <button>📢 공지</button>
    <button>👋 환영인사</button>
    <button>⚙️ 명령어</button>
  </aside>

  <main class='content'>
    <h2>나츠미 대시보드</h2>
    <p>웹에서 서버를 관리할 수 있어 😼</p>

    <div class='card-grid'>
      <div class='card'>
        <h3>🤖 봇 상태</h3>
        <p>24/7 ONLINE</p>
      </div>

      <div class='card'>
        <h3>🎫 티켓 시스템</h3>
        <p>새 티켓 시스템 적용됨</p>
      </div>

      <div class='card'>
        <h3>🦊 하트 인증</h3>
        <p>NSFW/SFW 보호 활성화</p>
      </div>
    </div>
  </main>
</div>
`;

import './style.css';
