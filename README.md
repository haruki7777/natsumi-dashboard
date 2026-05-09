# NATSUMI Dashboard

나츠미 디스코드 봇 전용 웹 대시보드입니다.

## 주요 기능

- Discord OAuth 로그인
- 서버별 설정 관리
- 명령어 ON/OFF
- NSFW/SFW 하트 인증 연동
- 환영인사 설정
- 공지 시스템
- 티켓 설정
- 서버 관리자 권한 체크

## 시스템 구조

- natsumi-dashboard → 웹 프론트엔드
- natsumi-bot-24-7 → Discord Bot + API 서버
- MongoDB → 설정 저장
- VPS → API 및 봇 실행
- Vercel/GitHub Pages → 대시보드 배포

## 예정 기능

- 실시간 서버 상태
- 웹 티켓 관리
- 로그 뷰어
- 통계 시스템
- 공지 예약 시스템
