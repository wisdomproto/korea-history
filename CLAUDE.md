# 한국사능력검정시험 학습 앱

## 프로젝트 구조

모노레포 — Expo 앱(메인), 저작도구(author-tool), SEO 웹사이트(web) 세 개의 앱이 공존.

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
│       │   ├── custom.tsx
│       │   ├── keyword.tsx
│       │   └── diagnostic.tsx
│       └── onboarding/    # 온보딩 (Stack, 탭바 숨김)
│           ├── _layout.tsx
│           ├── step1.tsx
│           ├── step2.tsx
│           ├── step3.tsx
│           └── complete.tsx
├── components/            # Expo 공용 컴포넌트
│   ├── Container.tsx      # 반응형 컨테이너 (maxWidth 640px)
│   └── NotesModal.tsx     # 요약노트 모달 (iframe + 딥링크)
├── hooks/                 # Expo 커스텀 훅
│   ├── useExamData.ts     # 시험 데이터 로딩 (async fetch + bundled fallback)
│   ├── useExam.ts         # CBT 모의고사 상태 관리
│   ├── useStudyState.ts   # 학습 모드 상태 관리 (confirm → reveal flow)
│   └── useResponsive.ts   # 반응형 breakpoint (mobile/tablet/desktop)
├── public/                # 정적 파일 (Expo web에서 서빙)
│   └── notes.html         # 한국사 요약노트 (self-contained HTML)
├── lib/                   # Expo 유틸리티
│   ├── constants.ts       # COLORS, SHADOWS, RADIUS, IMAGE_BASE_URL
│   ├── types.ts           # 타입 정의
│   ├── storage.ts         # AsyncStorage 래퍼
│   ├── examData.ts        # 시험 데이터 fetcher (R2 + bundled fallback)
│   └── storage.ts         # AsyncStorage 래퍼 (시험 상태 저장 등)
├── data/questions/        # 시험 데이터 JSON (양쪽 앱 공유)
│   ├── exam-{N}.json      # { exam: Exam, questions: Question[] }
│   └── exam-order.json    # 시험 순서 (ID 배열)
├── data/images/           # 문제 이미지 (R2 업로드 + 로컬 백업)
├── scripts/               # 유틸리티 스크립트
│   └── extract-images-from-pdf.py  # PDF 지문 이미지 추출 (PyMuPDF + Gemini 3.1 Pro)
├── author-tool/           # 저작도구 (별도 앱)
│   ├── server/            # Express API (port 3001)
│   │   ├── index.ts       # Express + Vite 통합 서버
│   │   ├── config.ts      # 환경설정 (dataDir, gemini key, R2)
│   │   ├── middleware.ts   # AppError, asyncHandler, errorMiddleware
│   │   ├── controllers/   # exam, question, generator, image, pdf-import
│   │   ├── services/      # 비즈니스 로직 (R2 업로드, PDF 이미지 추출 포함)
│   │   └── routes/        # Express 라우트
│   └── src/               # React + Vite 프론트엔드
│       ├── features/      # exam, question, generator, dashboard
│       ├── components/    # Layout, Sidebar, Button, Modal
│       ├── lib/           # axios, types, query-client
│       └── store/         # zustand (editor.store)
├── web/                   # SEO 웹사이트 (Next.js SSG)
│   ├── app/               # App Router 페이지
│   │   ├── layout.tsx     # 공통 레이아웃 (Header, Footer, GA, AdSense)
│   │   ├── page.tsx       # 메인 랜딩
│   │   ├── exam/          # 기출문제 (SSG, 3,279+ 페이지)
│   │   ├── notes/         # 요약노트 (SSG, 40~50 페이지)
│   │   ├── wrong-answers/ # 오답노트 (CSR, localStorage)
│   │   ├── privacy/       # 개인정보처리방침
│   │   └── terms/         # 이용약관
│   ├── components/        # Header, Footer, AdBanner, QuestionCard 등
│   └── lib/               # data loader, seo, wrong-answers (localStorage)
└── .claude/launch.json    # 서버 실행 설정
```

## 네비게이션 아키텍처

모든 화면은 `app/(tabs)/` 그룹 안에 존재하여 **하단 탭바가 항상 표시**된다.

- 5개 메인 탭: 홈, 학습, 노트, 분석, MY (Ionicons 아이콘)
- 숨김 화면: exam, onboarding, settings, premium → `href: null`로 등록, 탭바 UI에서 미표시
- 커스텀 탭바: `VISIBLE_TABS` Set으로 표시할 탭 필터링 (React Navigation descriptors에 Expo Router href 미노출 때문)
- `useSafeAreaInsets()` 적용으로 하단 안전영역 확보

```
(tabs)/_layout.tsx → CustomTabBar (Ionicons + safe area + active indicator)
├── index (홈)       — 탭바 표시
├── study (학습)     — 탭바 표시
├── notes (노트)     — 탭바 표시 (요약노트 iframe)
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
web-dev     → port 3000  (Next.js SEO 웹사이트)
```

- 저작도구: `cd author-tool && npm run dev` (tsx watch)
- Expo 앱: 루트에서 `npx expo start --web --port 8081`
- 웹사이트: `cd web && npm run dev` (Next.js dev server)

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
- **PDF text**: pdf-parse v2 (클래스 기반 API)
- **PDF image**: Python subprocess (`scripts/extract-images-from-pdf.py`) — PyMuPDF + Gemini 3.1 Pro bbox 감지
- **File upload**: multer (메모리 스토리지)
- **Image Storage**: Cloudflare R2 (S3 호환) — `@aws-sdk/client-s3`
- **Image Crop**: react-image-crop (프론트엔드 이미지 크롭)

## 핵심 데이터 모델

```typescript
// data/questions/exam-{N}.json
interface ExamFile {
  exam: Exam;        // id, examNumber, examDate, examType, totalQuestions, timeLimitMinutes, isFree
  questions: Question[];  // id, examId, questionNumber, content, passage?, imageUrl?,
                          // choices[5], choiceImages?[], correctAnswer(1-5), points,
                          // era, category, difficulty(1-3), explanation?
}
```

- Era: 선사·고조선 | 삼국 | 남북국 | 고려 | 조선 전기 | 조선 후기 | 근대 | 현대
- Category: 정치 | 경제 | 사회 | 문화

## 이미지 서빙

- 저작도구에서 이미지 업로드 시 Cloudflare R2에 저장
- R2 Public URL: `R2_PUBLIC_URL` 환경변수 (저작도구 `.env`에 설정)
- 메인 앱은 현재 번들된 데이터를 사용 (R2 fetching은 향후 추가)
- `IMAGE_BASE_URL`: `process.env.R2_PUBLIC_URL || 'http://localhost:3001'` (lib/constants.ts)

## PDF 이미지 추출 파이프라인

PDF 임포트 시 텍스트 파싱과 지문 이미지 추출이 **병렬**로 실행됨:

1. **텍스트 파싱** (Gemini): pdf-parse로 텍스트 추출 → Gemini로 문제 구조화
2. **이미지 추출** (Python + Gemini 3.1 Pro): 동시에 실행
   - `PdfImageService` → Python subprocess로 `scripts/extract-images-from-pdf.py` 호출
   - PyMuPDF로 페이지 렌더링 (3x 스케일) → Gemini 3.1 Pro가 지문 bbox 감지
   - 크롭된 이미지를 R2에 병렬 업로드 → questionNumber별 imageUrl 매핑
3. 두 결과를 합쳐서 `ParsedQuestion[]` 반환

- Python 스크립트: 페이지별 Gemini 호출을 `ThreadPoolExecutor(max_workers=4)`로 병렬 처리
- R2 업로드: `Promise.allSettled()`로 전체 병렬 업로드
- **반드시 Gemini 3.1 Pro 사용** (`gemini-3.1-pro-preview`) — 다른 모델은 bbox 정확도 낮음
- Python 의존성: `PyMuPDF`, `Pillow` (pip install)

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
- `POST /api/pdf/parse` — PDF 문제 추출 + 이미지 추출 (multipart/form-data, examNumber 지원)

## 정답 확인 + 요약노트 연동

문제 풀이 시 정답 확인 → AI 해설 → 요약노트 딥링크 플로우:

1. 선지 선택 → **"정답 확인"** 노란 버튼 표시
2. 정답 확인 클릭 → 정답/오답 피드백 + AI 해설 + **"요약노트 바로가기"** 버튼
3. 요약노트 클릭 → `NotesModal` 모달로 표시 (페이지 이동 없음, 상태 보존)
4. 모달 내 iframe에 `postMessage`로 딥링크:
   - `era` → section 매핑 (s1~s7)
   - `extractKeywords()`: 문제 내용에서 핵심 키워드 추출
   - notes.html의 메시지 핸들러가 해당 섹션 내 키워드 매칭 → sub-section 스크롤 + details 자동 펼침

적용 화면:
- CBT 모의고사 (`[examId].tsx`): `revealedSet` state로 문제별 정답 공개 추적
- 학습 모드 (`StudyView.tsx`): `useStudyState` 훅의 `handleConfirm`으로 정답 공개
- 단원별/오답복습/맞춤형/키워드별 학습 모두 동일 플로우

## SEO 웹사이트 (web/)

### 개요
- Next.js 14+ SSG로 네이버/구글 SEO 최적화된 웹사이트
- 회원가입 없음, localStorage로 오답 저장
- 애드센스 수익화 (요약노트 + 해설 아래만 광고)
- 상세 설계: `WEB_MONETIZATION_PLAN.md` 참조

### 네비게이션
상단 GNB: 기출문제 / 요약노트 / 오답노트 (3탭)

### 광고 배치 원칙
- **문제 풀이 중**: 광고 없음
- **정답 확인 후 해설 아래**: 광고 1개
- **요약노트 페이지**: 광고 2개 (본문 중간 + 하단)
- **그 외 (목록, 오답노트, 홈)**: 광고 없음

### 기술 스택
- Next.js 14+ (App Router, SSG), Tailwind CSS
- Vercel 배포 (무료), .kr 도메인
- Google AdSense, GA4, Naver Analytics
- localStorage (오답노트)
- 기존 data/questions/ JSON + R2 이미지 공유

### 오답노트 데이터 모델
```typescript
interface WrongAnswer {
  questionId: number;
  examId: number;
  selectedAnswer: number;
  correctAnswer: number;
  createdAt: string;
  resolved: boolean;       // 다시 풀어서 맞추면 true
  resolvedAt?: string;
}
// localStorage key: "wrong-answers"
```

### 요약노트 분할
- 기존 `public/summary-notes.html` (1.5MB) → 40~50개 JSON으로 분할
- `data/notes/` 디렉토리에 저장
- keywords.json 기반 문항 ↔ 노트 양방향 매핑

## 주의사항

- pdf-parse v2: `new PDFParse({ data: buffer })` → `.load()` → `.getText()` → `.text`
- Gemini API key: `author-tool/.env`에 `GEMINI_API_KEY` 설정 필요
- R2 설정: `author-tool/.env`에 `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` 필요
- 시험 데이터 경로: `data/questions/` (루트 기준, 양쪽 앱 공유)
- 시험 순서: `data/questions/exam-order.json`에 ID 배열로 저장
- 이미지: Cloudflare R2에 저장, `/uploads` 정적 경로는 로컬 fallback용
- 저작도구 서버는 Vite middleware mode로 API+프론트 통합 (dev에서 단일 포트)
- 커스텀 탭바에서 `options.href` 접근 불가 → `VISIBLE_TABS` Set으로 표시 탭 필터링
- PDF 이미지 추출에 Python 필요: `pip install PyMuPDF Pillow`
- Gemini 3.1 Pro bbox 감지: 반드시 `gemini-3.1-pro-preview` 모델 사용 (다른 모델 부정확)
- QuestionEditor에 이미지 크롭 기능 있음 (react-image-crop → Canvas API → R2 업로드)

## 언어

- 사용자 인터페이스: 한국어
- 코드/커밋: 영어
