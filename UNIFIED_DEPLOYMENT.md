# 🚀 통합 배포 가이드 (모바일 + 웹)

## 개요

하나의 서버에서 모바일과 웹을 모두 제공하는 통합 배포 전략입니다.

---

## 🎯 배포 아키텍처

```
┌─────────────────────────────────────────┐
│      Supabase (백엔드 + DB)             │
│    공통 API, 인증, 데이터 관리           │
└────────────┬─────────────────────────────┘
             │
    ┌────────┼────────┐
    │        │        │
    ▼        ▼        ▼
┌────────┐ ┌──────┐ ┌───────┐
│ 웹앱   │ │iOS  │ │Android│
│Vercel │ │ App  │ │ App   │
│/배포  │ │Store │ │Store  │
└────────┘ └──────┘ └───────┘
```

---

## 📱 방법 1: Expo EAS + Vercel (권장) ⭐

가장 쉽고 효율적인 방법입니다.

### 단계 1: Expo EAS 설정

```bash
# EAS CLI 설치
npm install -g eas-cli

# EAS 초기화
eas init
```

### 단계 2: 모바일 앱 빌드

```bash
# iOS 빌드 (Mac 필요)
eas build --platform ios

# Android 빌드
eas build --platform android

# 시뮬레이터에서 테스트
eas build --platform ios --local
```

### 단계 3: 웹 배포

```bash
# 빌드
npm run build

# Vercel에 배포
vercel deploy
```

### 단계 4: 앱 스토어 배포

- **iOS**: TestFlight → App Store
- **Android**: Google Play Console

---

## 🌐 방법 2: 자체 서버 호스팅

Node.js + Express 서버에서 웹을 호스팅하고, 모바일은 별도로 빌드합니다.

### 서버 구조

```
server/
├── public/              # 웹 앱 정적 파일 (npm run web 빌드)
│   ├── index.html
│   ├── js/
│   └── css/
├── api/                 # API 엔드포인트 (선택사항)
├── server.js            # Express 서버
└── package.json
```

### server.js 예제

```javascript
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')));

// SPA 라우팅 (모든 요청을 index.html로)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// CORS 설정 (모바일 앱에서 접근 가능하도록)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### 배포

**Railway, Render, Heroku 등에 배포 가능:**

```bash
# Vercel
vercel deploy

# Railway
railway up

# Render (push to GitHub, auto-deploy)
git push
```

---

## 🏗️ 방법 3: 모놀리식 Expo 앱

Expo 플랫폼 자체에서 모바일 + 웹을 모두 호스팅합니다.

### 장점
✅ 단일 코드베이스  
✅ 배포 간단  
✅ 핫 리로딩  

### 단점
❌ Expo 의존성  
❌ 커스터마이징 제한  

### 배포

```bash
# EAS로 모바일 빌드
eas build --platform ios
eas build --platform android

# Expo Hosting으로 웹 배포 (선택)
eas submit
```

---

## 🔧 권장 설정: 최적화된 통합 배포

### 구조

```
emmaus/
├── app/                     # React Native 코드 (모바일 + 웹)
├── public/                  # 웹 정적 에셋
├── server/                  # Express 서버 (선택)
├── .env.production         # 프로덕션 환경 변수
└── package.json
```

### 1단계: 환경 분리

**.env.development**
```env
EXPO_PUBLIC_KAKAO_APP_KEY=dev_key
EXPO_PUBLIC_SUPABASE_URL=dev_url
EXPO_PUBLIC_API_BASE=http://localhost:3000
```

**.env.production**
```env
EXPO_PUBLIC_KAKAO_APP_KEY=prod_key
EXPO_PUBLIC_SUPABASE_URL=prod_url
EXPO_PUBLIC_API_BASE=https://your-domain.com
```

### 2단계: 빌드 스크립트 추가

**package.json**
```json
{
  "scripts": {
    "build:web": "expo export --platform web",
    "build:ios": "eas build --platform ios",
    "build:android": "eas build --platform android",
    "build:all": "npm run build:web && npm run build:ios && npm run build:android",
    "deploy:web": "vercel deploy --prod",
    "deploy:all": "npm run build:all && npm run deploy:web"
  }
}
```

### 3단계: CI/CD 설정 (GitHub Actions)

**.github/workflows/deploy.yml**
```yaml
name: Build & Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build web
        run: npm run build:web
      
      - name: Deploy to Vercel
        uses: vercel/action@main
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
      
      - name: Build mobile (EAS)
        run: npm run build:all
        env:
          EAS_TOKEN: ${{ secrets.EAS_TOKEN }}
```

---

## 📊 방법별 비교

| 특성 | EAS + Vercel | 자체 서버 | Expo Hosting |
|------|--------------|---------|-------------|
| 설정 난이도 | 쉬움 | 중간 | 매우 쉬움 |
| 비용 | 저(무료~) | 중(서버비) | 중(유료) |
| 커스터마이징 | 높음 | 매우 높음 | 낮음 |
| 속도 | 빠름 | 중간 | 빠름 |
| 확장성 | 높음 | 매우 높음 | 제한적 |
| 프로덕션 준비 | ✅ | ✅ | ✅ |

---

## 🎯 현재 프로젝트 추천 경로

### 단기 (개발/테스트)
```
✅ npm run web     # 웹 로컬 개발
✅ npm start       # 모바일 로컬 개발 (Expo Go)
```

### 중기 (알파/베타)
```
✅ Vercel에 웹 배포
✅ EAS로 모바일 빌드 → TestFlight/Google Play Beta
```

### 장기 (프로덕션)
```
✅ App Store에서 iOS 배포
✅ Google Play에서 Android 배포
✅ Vercel/Netlify에서 웹 배포
✅ 하나의 도메인으로 통합 (예: emmaus-cantores.com)
```

---

## 🚀 즉시 시작하기

### 방법 1: Vercel에 웹만 먼저 배포

```bash
# 1. Vercel 가입 (github.com/vercel)
# 2. GitHub 연결
# 3. 프로젝트 선택
# 4. 자동 배포!
```

### 방법 2: Railway에 전체 서버 배포

```bash
# 1. Railway 가입
# 2. GitHub 연결
# 3. New Project → Deploy
# 자동으로 웹 + API 호스팅
```

### 방법 3: EAS로 모바일 빌드

```bash
# 1. eas login
# 2. eas build --platform android
# 3. Google Play에 업로드
```

---

## 📝 체크리스트

배포 전 확인사항:

- [ ] Supabase 프로덕션 환경 설정
- [ ] Kakao Developers 프로덕션 키 발급
- [ ] 웹 도메인 구입 (선택)
- [ ] 환경 변수 분리 (.env.production)
- [ ] HTTPS 설정 (필수)
- [ ] 로그 모니터링 설정 (Sentry 등)
- [ ] 성능 최적화 (번들 크기 분석)
- [ ] 보안 검사 (OWASP)
- [ ] 사용자 피드백 수집 준비

---

## 💰 예상 비용 (월)

| 서비스 | 비용 | 설명 |
|--------|------|------|
| Supabase (무료) | $0 | 개발 환경 충분 |
| Vercel | $0-$20 | 웹 호스팅 |
| EAS (무료) | $0 | 모바일 빌드 |
| 도메인 | $10-15 | Optional |
| **합계** | **$10-35** | 최소한의 비용 |

---

**하나의 서버에서 모바일 + 웹 모두 접근 가능! 🎉**
