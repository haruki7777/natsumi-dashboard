# NATSUMI Dashboard

나츠미 Discord 봇을 관리하기 위한 웹 대시보드입니다.

## 주요 기능

- Discord OAuth 로그인
- 관리자 권한이 있는 서버만 표시
- 서버별 명령어 ON/OFF
- 한디리 프리미엄 하트가 필요한 명령어 표시
- 환영인사, 공지, 티켓 설정 화면
- GitHub Pages 배포

## 개발

```bash
npm install
npm run dev
```

## 빌드

```bash
npm run build
```

## API 연동

기본 API 주소는 `https://natsumi-site.kro.kr`입니다.

다른 주소를 쓰려면 `.env`에 아래 값을 설정합니다.

```env
VITE_API_BASE_URL="https://example.com"
```
