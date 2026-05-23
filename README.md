# 🎵 엠마우스 깐또레스 (Emmaus Cantores)

> 성가대를 위한 올인원 모바일 관리 플랫폼

[![React Native](https://img.shields.io/badge/React%20Native-0.81-61dafb?style=flat-square&logo=react)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020?style=flat-square&logo=expo)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ecf8e?style=flat-square&logo=supabase)](https://supabase.com/)

---

## 📱 프로젝트 소개

**엠마우스 깐또레스**는 성가대 단원 관리, 일정 관리, 특송 관리, 투표 등
성가대 운영에 필요한 모든 기능을 하나로 묶은 모바일 앱입니다.
임원/단원 권한 분리, 파트별 관리, 푸시 알림까지 실제 운영에 최적화되어 있습니다.

---

## ✅ 구현된 기능

### 🔐 인증
- 카카오 소셜 로그인
- 이메일/비밀번호 로그인
- 세션 자동 유지 (AsyncStorage)
- 신규 가입 시 프로필 자동 생성

### 🏠 홈 대시보드
- 시간대별 인사말 (아침/오후/저녁)
- **미확인 알림 배지**: 미참여 진행중 투표, 미확인 특송
- 만료된 투표는 알림에서 자동 제외
- 알림 클릭 시 해당 상세 모달 자동 오픈
- 주요 메뉴 바로가기 (단원 / 투표 / 일정 / 특송)
- SNS 바로가기 (YouTube · Instagram)

### 👥 단원 관리
- 단원 목록 (파트별 필터, 이름/세례명 검색)
- 단원 상세 (이름, 세례명, 생일, 축일, 파트, 역할, 프로필 사진)
- 단원 추가 — 임원 이상
- 단원 삭제 (soft delete) — 단장 이상
- 전화번호 자동 포맷 (`010-XXXX-XXXX`)
- 직책: 단장 1명 제한 (기존 단장 자동 해제)

### 📅 일정 관리
- 월별 달력 뷰 (일정 마킹)
- 연도/월 선택 피커
- 일정 CRUD — 임원 이상
- 특송 복수 연결 (여러 곡 동시 등록)
- 투표 생성 및 일정 연결 (양방향 이동)
- 일정 상세에서 연결 특송/투표 인라인 표시

### 🎵 특송 관리
- 특송 CRUD — 임원 이상
- **유튜브 링크 다중 등록** — 파트별 소제목 (전체/소프라노/알토/테너/베이스/기타)
- **악보 파일 다중 업로드** — 파트별 레이블, PDF·이미지 지원
- 수정 시 기존 악보 파일 개별 삭제 가능
- Supabase Storage (`song-files` 버킷) 연동

### 🗳️ 투표
- 투표 CRUD — 임원/작성자
- 단일/복수 선택 지원
- 투표 종료 시간 설정
- 참여자 현황 (파트별 분류, 선택 항목 표시) — 임원 공개
- 미참여자 목록 및 푸시 알림 발송 — 임원/작성자
- 일정과 연동 (투표 → 일정 빠른 이동)

### 👤 내 프로필
- 개인정보 수정 (이름, 세례명, 전화번호, 생일, 축일, 파트)
- 프로필 사진 업로드 (Supabase Storage `avatars` 버킷)

### 📲 UX / Android
- 하드웨어 뒤로가기 — 열린 모달 우선 닫기 (`useFocusEffect` + `BackHandler`)
- 모든 Modal에 `onRequestClose` 처리 (모달 안에서도 뒤로가기 동작)
- 푸시 알림 (Expo Notifications + FCM)

---

## 🛠️ 기술 스택

### 프론트엔드
| 기술 | 버전 | 설명 |
|------|------|------|
| React Native | 0.81 | 크로스플랫폼 모바일 개발 |
| Expo | SDK 54 | 개발 플랫폼 및 빌드 |
| Expo Router | 6.x | 파일 기반 라우팅 |
| TypeScript | 5.9 | 타입 안정성 |
| NativeWind | 4.x | Tailwind CSS → React Native |
| Zustand | 5.x | 경량 전역 상태 관리 |
| date-fns | 4.x | 날짜/시간 처리 |

### 백엔드
| 서비스 | 역할 |
|--------|------|
| Supabase (PostgreSQL) | 메인 데이터베이스 |
| Supabase Auth | 인증 (이메일 + 카카오 OAuth) |
| Supabase Storage | 파일 저장 (프로필 사진, 악보) |
| Row Level Security | 테이블별 권한 정책 |

### 주요 라이브러리
| 라이브러리 | 용도 |
|-----------|------|
| expo-notifications | 푸시 알림 (FCM) |
| expo-document-picker | 악보 파일 선택 |
| expo-image-picker | 프로필 사진 선택 |
| react-native-calendars | 달력 컴포넌트 |
| expo-crypto | UUID 생성 |
| @react-native-async-storage | 로컬 데이터 저장 |

---

## 🗄️ 데이터베이스 구조

```
profiles        단원 프로필 (id: random UUID, auth_id: Supabase auth UUID)
votes           투표
vote_items      투표 항목
vote_responses  투표 응답 (user_id ↔ profile.id)
schedules       일정 (song_ids: uuid[], vote_id)
songs           특송 (youtube_links: text[], youtube_titles: text[])
song_files      악보 파일 (label: 파트명)
```

### 마이그레이션 파일
| 파일 | 내용 |
|------|------|
| `schema.sql` | 초기 스키마 전체 |
| `migration_member_crud.sql` | 단원 CRUD + `auth_id` 분리 |
| `migration_songs_youtube.sql` | 유튜브 다중 링크 |
| `migrations/migration_songs_youtube_titles.sql` | 유튜브 파트 소제목 |
| `migration_schedule_song.sql` | 일정-특송 연결 |
| `migrations/migration_schedule_multiple_songs.sql` | 일정에 특송 복수 연결 |
| `migrations/migration_votes_schedule_link.sql` | 투표-일정 연결 |
| `migration_leader_single.sql` | 단장 1명 제한 |
| `migration_fix_vote_rls.sql` | vote_responses RLS 수정 (auth_id 기반) |
| `migrations/migration_song_file_label.sql` | 악보 파트 레이블 |

---

## 📂 프로젝트 구조

```
emmaus/
├── app/
│   ├── (auth)/
│   │   └── login.tsx           # 카카오/이메일 로그인
│   └── (main)/
│       ├── home.tsx            # 홈 대시보드
│       ├── profile.tsx         # 내 프로필
│       ├── members/
│       │   ├── index.tsx       # 단원 목록
│       │   └── [id].tsx        # 단원 상세
│       ├── votes/
│       │   ├── index.tsx       # 투표 목록 + 상세
│       │   ├── create.tsx      # 투표 생성
│       │   └── [id].tsx        # 투표 상세 (독립 화면)
│       ├── schedule/
│       │   └── index.tsx       # 달력 + 일정 관리
│       └── songs/
│           └── index.tsx       # 특송 목록 + 관리
├── components/
│   └── ui/                     # Card, Button, Input 등 공통 컴포넌트
├── lib/
│   ├── supabase.ts             # Supabase 클라이언트
│   └── notifications.ts        # 푸시 알림 유틸
├── store/
│   ├── auth.ts                 # 인증 상태 (Zustand)
│   ├── home-navigation.ts      # 홈 → 상세 이동용 상태
│   └── schedule.ts             # 일정 선택일 상태
├── types/
│   └── index.ts                # TypeScript 타입 정의
└── supabase/
    ├── schema.sql              # 초기 스키마
    ├── seed.sql                # 시드 데이터
    └── migrations/             # 마이그레이션 파일들
```

---

## 🚀 시작하기

### 필수 요구사항
- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Supabase 프로젝트
- 카카오 디벨로퍼스 앱 (소셜 로그인 사용 시)

### 설치 및 실행

```bash
# 1. 저장소 클론
git clone https://github.com/InSub-Shin/EmmausCantores.git
cd EmmausCantores

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정
cp .env.example .env
# .env 에 Supabase URL, anon key, 카카오 키 입력

# 4. 개발 서버 시작
npm start

# 5. Expo Go 또는 에뮬레이터로 실행
```

### Supabase 설정

```bash
# 1. schema.sql 실행 (초기 스키마)
# 2. migration 파일들을 순서대로 실행
# 3. Storage 버킷 생성: avatars, song-files
```

### 환경 변수

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_KAKAO_REST_API_KEY=your-kakao-rest-api-key
EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY=your-kakao-native-key
```

---

## 🔐 권한 구조

| 역할 | 단원 추가 | 투표 생성 | 일정 생성 | 특송 추가 | 단원 삭제 | 미참여 알림 |
|------|:---------:|:---------:|:---------:|:---------:|:---------:|:-----------:|
| 평단원 | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| 임원 (악보장·회계 등) | ✅ | ✅ | ✅ | ✅ | ✗ | ✅ |
| 단장 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

> 임원 여부는 `profiles.is_executive` 로 관리됩니다.

---

## 🔧 개발 도구

- **Claude Code** — AI 기반 개발 어시스턴트
- **Supabase Dashboard** — DB 관리 및 쿼리
- **Expo Go** — 실기기 테스트
- **Git / GitHub** — 버전 관리

---

## 🚢 배포

### EAS Build (Expo Application Services)

```bash
# Android (AAB → Play Store)
eas build --platform android --profile production

# iOS (IPA → App Store)
eas build --platform ios --profile production
```

### 스토어 제출

```bash
eas submit --platform android
eas submit --platform ios
```

| 플랫폼 | 상태 |
|--------|------|
| Android (Play Store) | ✅ 빌드 완료 |
| iOS (App Store) | 🔄 진행 예정 |

---

## 🔗 SNS

| 채널 | 링크 |
|------|------|
| YouTube | [@EmmausCantores](https://www.youtube.com/@EmmausCantores) |
| Instagram | [@_emmauss](https://www.instagram.com/_emmauss/) |

---

## 📝 라이선스

MIT License

---

<div align="center">

**made with ❤️ by insub**

[![GitHub](https://img.shields.io/badge/GitHub-InSub--Shin-181717?style=flat-square&logo=github)](https://github.com/InSub-Shin)

</div>
