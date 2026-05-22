# 🎵 엠마우스 깐또레스 (Emmaus Cantores)

> 성가대를 위한 올인원 디지털 관리 플랫폼

[![React Native](https://img.shields.io/badge/React%20Native-0.76-61dafb?style=flat-square&logo=react)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK%2056-000020?style=flat-square&logo=expo)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ecf8e?style=flat-square&logo=supabase)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

---

## 📱 프로젝트 소개

**엠마우스 깐또레스**는 성가대 관리를 위한 종합 모바일 애플리케이션입니다.
단원 관리, 일정 관리, 특송 관리, 투표 등 성가대 운영에 필요한 모든 기능을 한 플랫폼에서 제공합니다.

### 🎯 주요 기능

- **👥 단원 관리** - 단원 정보, 파트, 역할 관리
- **📅 일정 관리** - 연습, 미사, 행사 일정 관리 및 특송 연결
- **🎵 특송 관리** - 유튜브 링크, 악보 파일 첨부 가능
- **🗳️ 투표 시스템** - 일정과 연계된 투표, 익명 투표 지원
- **🔔 알림 기능** - 푸시 알림으로 미참여자 안내
- **🔐 권한 관리** - 임원/단원별 권한 제어

---

## 🛠️ 기술 스택

### 프론트엔드
| 기술 | 설명 |
|------|------|
| **React Native** | 크로스플랫폼 모바일 앱 개발 |
| **Expo** | React Native 개발 및 배포 플랫폼 |
| **TypeScript** | 타입 안정성 및 개발 경험 향상 |
| **NativeWind** | Tailwind CSS를 React Native에서 사용 |
| **Zustand** | 경량 상태 관리 라이브러리 |

### 스타일링 & UI
| 도구 | 기능 |
|------|------|
| **Tailwind CSS v3** | 유틸리티 기반 스타일링 |
| **React Native Calendars** | 상호작용형 달력 컴포넌트 |
| **Expo Router** | 파일 기반 라우팅 |

### 백엔드 & 데이터베이스
| 서비스 | 역할 |
|--------|------|
| **Supabase** | PostgreSQL 데이터베이스 + Auth |
| **Row Level Security** | 데이터 보안 정책 |
| **Real-time Sync** | 실시간 데이터 동기화 |

### 유틸리티
| 라이브러리 | 목적 |
|-----------|------|
| **date-fns** | 날짜 및 시간 처리 |
| **Kakao Login** | 카카오 소셜 로그인 |
| **Expo Notifications** | 푸시 알림 기능 |
| **Expo Image Picker** | 이미지 선택 및 업로드 |

---

## 🔧 개발 도구

### IDE & 에디터
- **Claude Code** - AI 기반 개발 어시스턴트, 실시간 코드 작성 및 검토
- **VS Code** - 코드 편집 및 디버깅

### 버전 관리
- **Git & GitHub** - 소스 코드 관리 및 협업

### 개발 환경
- **Node.js & npm** - 패키지 관리 및 빌드 도구
- **Expo CLI** - React Native 개발 및 테스트
- **TypeScript Compiler** - 타입 체크 및 컴파일

### API & 서비스
- **Supabase Dashboard** - 데이터베이스 관리 및 쿼리 작성
- **Kakao Developers** - 소셜 로그인 통합

---

## 📦 주요 구현 기능

### 🗓️ 달력 기능
- ✅ 연도/월 선택 피커 (축일 선택 UI와 동일)
- ✅ 좌우 화살표로 월 이동 시 선택일 자동 변경
- ✅ 유효하지 않은 날짜 자동 조정 (예: 3월 31일 → 2월 선택 → 2월 28일)
- ✅ 실시간 일정 마킹

### 🎯 투표-일정 연계
- ✅ 투표와 일정의 양방향 연결
- ✅ 일정 상세에서 투표 생성 및 관리
- ✅ 투표 상세에서 연계된 일정 빠른 이동
- ✅ 자동 날짜 선택 (탭 이동 시)

### 🔐 권한 관리
- ✅ 임원/단원 역할별 CRUD 제어
- ✅ Row Level Security (RLS) 정책
- ✅ 투표 항목 응답 시 수정/삭제 제한

---

## 🚀 시작하기

### 필수 요구사항
```bash
- Node.js 16.0+
- npm 또는 yarn
- Expo CLI
```

### 설치 및 실행

1. **저장소 클론**
```bash
git clone https://github.com/InSub-Shin/EmmausCantores.git
cd EmmausCantores
```

2. **의존성 설치**
```bash
npm install
```

3. **환경 변수 설정**
```bash
cp .env.example .env
# .env 파일에 Supabase, Kakao 키 설정
```

4. **개발 서버 시작**
```bash
npm start
```

5. **Expo Go로 테스트**
- Expo Go 앱 설치
- QR 코드 스캔

---

## 📂 프로젝트 구조

```
emmaus/
├── app/                      # 라우팅 (Expo Router)
│   ├── (auth)/              # 인증 화면
│   └── (main)/              # 메인 탭
│       ├── schedule/        # 일정 관리
│       ├── votes/           # 투표 관리
│       ├── songs/           # 특송 관리
│       ├── members/         # 단원 관리
│       └── profile/         # 프로필
├── components/               # 재사용 가능한 컴포넌트
│   └── ui/                  # UI 컴포넌트
├── lib/                     # 유틸리티 함수
├── store/                   # Zustand 상태 관리
├── types/                   # TypeScript 타입 정의
└── supabase/               # 데이터베이스 스키마 & 마이그레이션
```

---

## 📝 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 참고

---

## 🤝 기여 안내

버그 리포트 및 기능 제안은 [Issues](https://github.com/InSub-Shin/EmmausCantores/issues)에서 등록해주세요.

---

<div align="center">

**made with ❤️ by insub**

[![GitHub](https://img.shields.io/badge/GitHub-InSub--Shin-181717?style=flat-square&logo=github)](https://github.com/InSub-Shin)

</div>
