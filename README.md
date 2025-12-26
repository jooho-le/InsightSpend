# InsightSpend

간단한 설치·실행 가이드입니다.

## 설치
1. 리포지터리 루트에서 의존성을 설치합니다.

   ```bash
   npm install
   ```

2. 워크스페이스(`apps/mobile`/`apps/web`)마다 따로 `npm install`이 수행되므로, 루트 install만으로 충분합니다.

## 실행
### 모바일 (Expo)
1. `.env`(apps/mobile/.env)에서 Firebase/Google/AI 환경변수를 채운 후 Expo 서버를 시작합니다.

   ```bash
   npm run dev:mobile
   ```

2. QR 코드 또는 시뮬레이터로 Expo 앱을 실행하고, Google 로그인을 테스트합니다.

### 웹 (Vite)
1. `.env`(apps/web/.env)에서 `VITE_OPENAI_*` 등을 채운 후 웹 서버를 실행합니다.

   ```bash
   npm run dev:web
   ```

2. `http://localhost:5173`(또는 Vite가 안내하는 URL)에서 대시보드를 확인하세요.

## 참고
- Firebase 설정(`EXPO_PUBLIC_*`, `VITE_*`)이 정확해야 Google 로그인 / AI 기능이 동작합니다.  
- 배포 시 환경변수를 호스팅 서비스(예: JCloud, Vercel)에 다시 등록하는 것을 잊지 마세요.
