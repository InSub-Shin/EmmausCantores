# 🌐 웹 지원 설정 가이드

## 개요

엠마우스 깐또레스는 이제 **모바일과 웹 모두에서 접근 가능**합니다!

---

## 🚀 웹 개발 서버 시작

### 1. 의존성 확인
```bash
npm install
```

### 2. 웹 서버 시작
```bash
npm run web
```

브라우저에서 자동으로 http://localhost:19006 열림

### 3. Expo DevTools 활용
- **'w'** - 웹 프리뷰 새로고침
- **'r'** - 번들 재구성
- **'q'** - 종료

---

## 📱 모바일 vs 웹 기능 비교

### ✅ 웹에서 동일하게 작동하는 기능
| 기능 | 상태 |
|------|------|
| 단원 관리 | ✅ |
| 일정 관리 | ✅ |
| 특송 관리 | ✅ |
| 투표 시스템 | ✅ |
| 달력 네비게이션 | ✅ |
| 프로필 관리 | ✅ |

### ⚠️ 웹에서 제한되는 기능
| 기능 | 모바일 | 웹 | 대체 방법 |
|------|--------|-----|---------|
| 푸시 알림 | ✅ | ❌ | Web Notifications |
| 카메라 | ✅ | ⚠️ | 파일 업로드 |
| Kakao 로그인 | ✅ | ✅ | OAuth 리다이렉트 |

---

## 🔐 Kakao 로그인 웹 설정

### 1. Kakao Developers 설정

[Kakao Developers Console](https://developers.kakao.com)에서:

1. 앱 선택 → **플랫폼** → **Web** 추가
2. **사이트 도메인** 등록:
   - 개발: `http://localhost:19006`
   - 프로덕션: `https://yourdomain.com`

3. **동의 항목** 확인:
   - 프로필 정보
   - 프로필 이미지

### 2. .env 파일 확인
```env
EXPO_PUBLIC_KAKAO_APP_KEY=your_kakao_app_key
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

### 3. lib/kakao.ts 동작 원리

웹 환경에서는:
- `Platform.OS === 'web'` 감지
- 자동으로 Kakao 로그인 URL로 리다이렉트
- 로그인 후 자동으로 앱으로 돌아옴

---

## 📐 반응형 디자인

현재 앱은 모바일 우선 설계이지만, 웹에서도 잘 작동합니다.

### 자동 반응형 처리
- **NativeWind/Tailwind CSS**: 자동 반응형 적용
- **Safe Area**: 웹에서는 무시됨
- **Touch vs Click**: 자동 처리

### 웹에서 최적화하기
```typescript
import { Platform } from 'react-native';

// 웹에서만 실행
if (Platform.OS === 'web') {
  // 웹 전용 로직
}

// 모바일에서만 실행
if (Platform.OS !== 'web') {
  // 모바일 전용 로직
}
```

---

## 🌍 프로덕션 배포

### Expo Web 배포 (권장)

1. **빌드**
```bash
npx expo export --platform web
```

2. **배포**
   - Vercel: `vercel` CLI로 `dist` 폴더 배포
   - Netlify: GitHub 연결 후 자동 배포
   - Static Server: `dist` 폴더 호스팅

### 필수 환경 변수 설정
```env
EXPO_PUBLIC_KAKAO_APP_KEY=production_key
EXPO_PUBLIC_SUPABASE_URL=production_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=production_key
```

---

## 🐛 트러블슈팅

### Q: 웹에서 Kakao 로그인이 작동하지 않음
**A:** 
1. Kakao Developers에서 웹 플랫폼 추가 확인
2. 사이트 도메인이 정확하게 등록되었는지 확인
3. 브라우저 개발자 도구 콘솔에서 오류 확인

### Q: 스타일이 웹에서 이상함
**A:**
1. 캐시 삭제: `Ctrl+Shift+Delete`
2. `npm run web`으로 다시 시작
3. 다른 브라우저에서 테스트

### Q: 사진 업로드가 웹에서 작동하지 않음
**A:** 웹 환경에서 일반 파일 업로드로 대체됨 (일반적으로 작동)

---

## 📚 참고 자료

- [Expo Web Documentation](https://docs.expo.dev/bare/hello-world/)
- [React Native Web](https://necolas.github.io/react-native-web/)
- [Kakao Developers](https://developers.kakao.com)

---

## 🎯 체크리스트

배포 전 확인사항:

- [ ] 로컬에서 `npm run web` 테스트
- [ ] Kakao 로그인 테스트
- [ ] 모든 CRUD 기능 테스트
- [ ] 모바일과 웹에서 UI 확인
- [ ] Supabase 권한 설정 확인
- [ ] 프로덕션 환경 변수 설정
- [ ] 배포 전 최종 테스트

---

**Happy coding! 🚀**
