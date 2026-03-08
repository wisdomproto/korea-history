# 한국사능력검정시험 학습 앱

## 프로젝트 구조

모노레포 — Expo 앱(메인)과 저작도구(author-tool) 두 개의 앱이 공존.

```
korea_history/
├── app/                   # Expo Router 페이지 (메인 앱)
│   ├── _layout.tsx        # 루트 레이아웃 (Stack → (tabs)만 포함)
│   └── (tabs)/            # 모든 화면이 탭 그룹 안에 존재
│       ├── _layout.tsx    # 커스텀 탭바 + 숨김 스크린 등록
│       ├── index.tsx      # 홈
│       ├── study.tsx      # 학습
│       ├── analysis.tsx   # 분석
│       ├── mypage.tsx     # MY
│       ├── settings.tsx   # 학습 설정 (탭바 숨김)
│       ├── premium.tsx    # 프리미엄 (탭바 숨김)
│       ├── exam/          # 시험 관련 화면 (Stack, 탭바 숨김)
│       │   ├── _layout.tsx
│       │   ├── select.tsx
│       │   ├── [examId].tsx
│       │   ├── result/[examId].tsx
│       │   ├── explanation/[examId].tsx
│       │   ├── review.tsx
│       │   ├── unit.tsx
│       │   └── diagnostic.tsx
│       └── onboarding/    # 온보딩 (Stack, 탭바 숨김)
│           ├── _layout.tsx
│           ├── step1.tsx
│           ├── step2.tsx
│           ├── step3.tsx
│           └── complete.tsx
├── components/            # Expo 공용 컴포넌트
│   └── Container.tsx      # 반응형 컨테이너 (maxWidth 640px)
├── hooks/                 # Expo 커스텀 훅
│   ├── useExamData.ts     # 시험 데이터 로딩 (TanStack Query)
│   └── useResponsive.ts   # 반응형 breakpoint (mobile/tablet/desktop)
├── lib/                   # Expo 유틸리티
│   ├── constants.ts       # COLORS, SHADOWS, RADIUS, IMAGE_BASE_URL
│   ├── types.ts           # 타입 정의
│   ├── storage.ts         # AsyncStorage 래퍼
│   └── examData.ts        # 시험 데이터 fetcher
├── data/questions/        # 시험 데이터 JSON (양쪽 앱 공유)
│   ├── exam-{N}.json      # { exam: Exam, questions: Question[] }
│   └── exam-order.json    # 시험 순서 (ID 배열)
├── data/images/           # 문제 이미지 (R2 업로드 + 로컬 백업)
├── author-tool/           # 저작도구 (별도 앱)
│   ├── server/            # Express API (port 3001)
│   │   ├── index.ts       # Express + Vite 통합 서버
│   │   ├── config.ts      # 환경설정 (dataDir, gemini key, R2)
│   │   ├── middleware.ts   # AppError, asyncHandler, errorMiddleware
│   │   ├── controllers/   # exam, question, generator, image, pdf-import
│   │   ├── services/      # 비즈니스 로직 (R2 업로드 포함)
│   │   └── routes/        # Express 라우트
│   └── src/               # React + Vite 프론트엔드
│       ├── features/      # exam, question, generator, dashboard
│       ├── components/    # Layout, Sidebar, Button, Modal
│       ├── lib/           # axios, types, query-client
│       └── store/         # zustand (editor.store)
└── .claude/launch.json    # 서버 실행 설정
```

## 네비게이션 아키텍처

모든 화면은 `app/(tabs)/` 그룹 안에 존재하여 **하단 탭바가 항상 표시**된다.

- 4개 메인 탭: 홈, 학습, 분석, MY (Ionicons 아이콘)
- 숨김 화면: exam, onboarding, settings, premium → `href: null`로 등록, 탭바 UI에서 미표시
- 커스텀 탭바: `VISIBLE_TABS` Set으로 표시할 탭 필터링 (React Navigation descriptors에 Expo Router href 미노출 때문)
- `useSafeAreaInsets()` 적용으로 하단 안전영역 확보

```
(tabs)/_layout.tsx → CustomTabBar (Ionicons + safe area + active indicator)
├── index (홈)       — 탭바 표시
├── study (학습)     — 탭바 표시
├── analysis (분석)  — 탭바 표시
├── mypage (MY)      — 탭바 표시
├── exam/            — Stack, href:null (탭바 유지, 탭에서 숨김)
├── onboarding/      — Stack, href:null
├── settings         — href:null
└── premium          — href:null
```

## 반응형 디자인

- `Container` 컴포넌트: 모바일 전체너비, 태블릿/웹에서 `maxWidth: 640px` 중앙정렬
- `useResponsive` 훅: `isMobile(<768)`, `isTablet(768-1024)`, `isDesktop(>1024)` breakpoint
- 디자인 토큰: `COLORS` (Tailwind 기반), `SHADOWS` (sm/md/lg), `RADIUS` (sm=8/md=12/lg=16/xl=20)

## 서버 실행

```
# .claude/launch.json에 정의됨
expo-web    → port 8081  (Expo 메인 앱)
author-tool → port 3001  (저작도구: Express API + Vite 통합)
```

- 저작도구: `cd author-tool && npm run dev` (tsx watch)
- Expo 앱: 루트에서 `npx expo start --web --port 8081`

## 기술 스택

### 메인 앱 (Expo)
- Expo SDK 55, expo-router, React Native Web
- AsyncStorage, expo-haptics
- `@expo/vector-icons` (Ionicons) — 탭바 및 화면 아이콘
- `react-native-safe-area-context` — 안전영역 처리
- TanStack Query — 시험 데이터 로딩

### 저작도구 (author-tool)
- **Server**: Express + Vite middleware mode (단일 프로세스)
- **Frontend**: React 18, Vite, TailwindCSS, TanStack Query
- **State**: Zustand (editor.store)
- **AI**: Gemini API — `@google/generative-ai` (텍스트), `@google/genai` (이미지)
- **PDF**: pdf-parse v2 (클래스 기반 API)
- **File upload**: multer (메모리 스토리지)
- **Image Storage**: Cloudflare R2 (S3 호환) — `@aws-sdk/client-s3`

## 핵심 데이터 모델

```typescript
// data/questions/exam-{N}.json
interface ExamFile {
  exam: Exam;        // id, examNumber, examDate, examType, totalQuestions, timeLimitMinutes, isFree
  questions: Question[];  // id, examId, questionNumber, content, passage?, imageUrl?,
                          // choices[5], correctAnswer(1-5), points, era, category, difficulty(1-3)
}
```

- Era: 선사·고조선 | 삼국 | 남북국 | 고려 | 조선 전기 | 조선 후기 | 근대 | 현대
- Category: 정치 | 경제 | 사회 | 문화

## 이미지 서빙

- 저작도구에서 이미지 업로드 시 Cloudflare R2에 저장
- R2 Public URL: `R2_PUBLIC_URL` 환경변수 (저작도구 `.env`에 설정)
- 메인 앱은 현재 번들된 데이터를 사용 (R2 fetching은 향후 추가)
- `IMAGE_BASE_URL`: `process.env.R2_PUBLIC_URL || 'http://localhost:3001'` (lib/constants.ts)

## 저작도구 API 엔드포인트

- `GET/POST /api/exams` — 시험 목록/생성
- `POST /api/exams/reorder` — 시험 순서 변경
- `GET/PUT/DELETE /api/exams/:id` — 시험 CRUD
- `GET/POST /api/questions` — 문제 목록/생성
- `POST /api/questions/batch` — 문제 일괄 추가
- `POST /api/questions/reorder` — 문제 순서 변경
- `PUT/DELETE /api/questions/:id` — 문제 수정/삭제
- `POST /api/generate` — AI 문제 생성
- `POST /api/images/generate` — AI 이미지 생성
- `POST /api/images/upload` — 이미지 업로드 (R2)
- `DELETE /api/images/:key` — 이미지 삭제 (R2)
- `GET /api/images/models` — 사용 가능 모델 목록
- `POST /api/pdf/parse` — PDF 문제 추출 (multipart/form-data)

## 주의사항

- pdf-parse v2: `new PDFParse({ data: buffer })` → `.load()` → `.getText()` → `.text`
- Gemini API key: `author-tool/.env`에 `GEMINI_API_KEY` 설정 필요
- R2 설정: `author-tool/.env`에 `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` 필요
- 시험 데이터 경로: `data/questions/` (루트 기준, 양쪽 앱 공유)
- 시험 순서: `data/questions/exam-order.json`에 ID 배열로 저장
- 이미지: Cloudflare R2에 저장, `/uploads` 정적 경로는 로컬 fallback용
- 저작도구 서버는 Vite middleware mode로 API+프론트 통합 (dev에서 단일 포트)
- 커스텀 탭바에서 `options.href` 접근 불가 → `VISIBLE_TABS` Set으로 표시 탭 필터링

## 언어

- 사용자 인터페이스: 한국어
- 코드/커밋: 영어
