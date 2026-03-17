# 기출노트 한능검 — 한국사능력검정시험 학습 플랫폼

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
│       └── onboarding/    # 온보딩 (Stack, 탭바 숨김)
├── components/            # Expo 공용 컴포넌트
├── hooks/                 # Expo 커스텀 훅
├── public/                # 정적 파일 (Expo web에서 서빙)
├── lib/                   # Expo 유틸리티
├── data/questions/        # 시험 데이터 JSON (로컬 + R2 동기화)
│   ├── exam-{N}.json      # { exam: Exam, questions: Question[] }
│   ├── exam-order.json    # 시험 순서 (ID 배열)
│   └── keywords.json      # 키워드 → 문제 ID 매핑
├── data/notes/            # 요약노트 JSON (40~87개)
│   ├── index.json         # 노트 메타데이터 인덱스
│   └── {sectionId}.json   # 개별 노트 (s1-01 ~ s7-xx)
├── data/images/           # 문제 이미지 (R2 업로드 + 로컬 백업)
├── scripts/               # 유틸리티 스크립트
├── author-tool/           # 저작도구 (별도 앱, Railway 배포)
│   ├── server/            # Express API
│   │   ├── index.ts       # Express + Vite 통합 서버
│   │   ├── config.ts      # 환경설정 (dataDir, gemini, R2, vercel)
│   │   ├── controllers/   # exam, question, generator, image, pdf-import
│   │   ├── services/      # 비즈니스 로직 (R2 업로드, PDF 이미지 추출)
│   │   └── routes/        # Express 라우트
│   └── src/               # React + Vite 프론트엔드
│       ├── features/      # exam, question, generator, dashboard
│       ├── components/    # Layout, Sidebar (+ DeployButton), Button, Modal
│       ├── lib/           # axios, types, query-client
│       └── store/         # zustand (editor.store)
├── web/                   # SEO 웹사이트 (Next.js SSG, Vercel 배포)
│   ├── scripts/           # fetch-data.ts (prebuild: R2 → .data-cache/)
│   ├── app/               # App Router 페이지
│   │   ├── layout.tsx     # 공통 레이아웃 (Header, Footer, GA, AdSense)
│   │   ├── page.tsx       # 메인 랜딩 (콘텐츠 허브)
│   │   ├── exam/          # 기출문제 (SSG, 2,076 페이지)
│   │   ├── notes/         # 요약노트 (SSG, 87 페이지)
│   │   ├── study/         # 학습하기 (회차별, 맞춤형, 키워드별)
│   │   ├── wrong-answers/ # 오답노트 (CSR, localStorage)
│   │   ├── privacy/       # 개인정보처리방침
│   │   └── terms/         # 이용약관
│   ├── components/        # Header, Footer, QuestionCard, BreadCrumb 등
│   └── lib/               # data.ts, notes.ts, seo.ts, wrong-answers.ts, types.ts
├── docs/                  # 프로젝트 문서
│   └── archive/           # 이전 버전 문서 백업
└── .claude/launch.json    # 서버 실행 설정
```

## 배포 아키텍처

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  저작도구    │────▶│ Cloudflare R2│◀────│  웹사이트   │
│  (Railway)  │     │ (데이터+이미지)│     │  (Vercel)   │
└─────────────┘     └──────────────┘     └─────────────┘
       │                                        ▲
       │         "웹 배포" 버튼                   │
       └──── Vercel Deploy Hook ────────────────┘
```

- **저작도구** (Railway): 문제 수정 → R2에 JSON/이미지 저장
- **웹사이트** (Vercel): prebuild에서 R2 데이터 다운로드 → SSG 생성
- **데이터** (Cloudflare R2): 시험 JSON + 이미지 (이그레스 무료)
- **배포 흐름**:
  - 코드 변경 → `git push` → Vercel/Railway 자동 재배포
  - 데이터 변경 → 저작도구 "웹 배포" 버튼 → Vercel 재빌드 (push 불필요)

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
- AsyncStorage, expo-haptics, Ionicons
- TanStack Query, react-native-safe-area-context

### 저작도구 (author-tool) — Railway 배포
- **Server**: Express + Vite middleware mode (단일 프로세스)
- **Frontend**: React 18, Vite, TailwindCSS, TanStack Query
- **State**: Zustand (editor.store)
- **AI**: Gemini API — `@google/generative-ai` (텍스트), `@google/genai` (이미지)
- **PDF text**: pdf-parse v2 (클래스 기반 API)
- **PDF image**: Python subprocess — PyMuPDF + Gemini 3.1 Pro bbox 감지
- **Image Storage**: Cloudflare R2 (S3 호환) — `@aws-sdk/client-s3`
- **Deploy**: Vercel Deploy Hook 호출 (`POST /api/exams/deploy`)

### SEO 웹사이트 (web/) — Vercel 배포
- Next.js 16+ (App Router, SSG), Tailwind CSS v4
- `output: "export"` (정적 HTML 내보내기)
- Prebuild: `scripts/fetch-data.ts` → R2에서 .data-cache/로 다운로드
- `lib/data.ts`: .data-cache/ 우선, 없으면 ../data/questions/ fallback
- localStorage (오답노트), Google AdSense, GA4

## 웹사이트 데이터 흐름

```
1. prebuild (scripts/fetch-data.ts):
   R2 manifest.json → exam numbers 파악
   R2 questions/exam-{N}.json → .data-cache/exam-{N}.json (배치 5개씩)
   R2 questions/keywords.json → .data-cache/keywords.json

2. build (next build):
   lib/data.ts → .data-cache/ 에서 동기적 파일 읽기
   lib/notes.ts → ../data/notes/ 에서 동기적 파일 읽기 (노트는 로컬)
   SSG로 2,076 페이지 생성

3. 이미지:
   question.imageUrl이 R2 풀 URL을 직접 가리킴 → 빌드 시 다운로드 불필요
```

## 핵심 데이터 모델

```typescript
// R2: questions/exam-{N}.json, 로컬: data/questions/exam-{N}.json
interface ExamFile {
  exam: Exam;        // id, examNumber, examDate, examType, totalQuestions, timeLimitMinutes, isFree
  questions: Question[];  // id, examId, questionNumber, content, passage?, imageUrl?,
                          // choices[5], choiceImages?[], correctAnswer(1-5), points,
                          // era, category, difficulty(1-3), explanation?, keywords?
}
```

- Era: 선사·고조선 | 삼국 | 남북국 | 고려 | 조선 전기 | 조선 후기 | 근대 | 현대
- Category: 정치 | 경제 | 사회 | 문화

## 저작도구 API 엔드포인트

- `GET/POST /api/exams` — 시험 목록/생성
- `POST /api/exams/reorder` — 시험 순서 변경
- `POST /api/exams/sync` — R2 → 로컬 동기화
- `POST /api/exams/deploy` — Vercel Deploy Hook 트리거 (웹사이트 재빌드)
- `GET/PUT/DELETE /api/exams/:id` — 시험 CRUD
- `GET/POST /api/questions` — 문제 목록/생성
- `POST /api/questions/batch` — 문제 일괄 추가
- `POST /api/questions/reorder` — 문제 순서 변경
- `PUT/DELETE /api/questions/:id` — 문제 수정/삭제
- `POST /api/generate` — AI 문제 생성
- `POST /api/images/generate` — AI 이미지 생성
- `POST /api/images/upload` — 이미지 업로드 (R2)
- `DELETE /api/images/:key` — 이미지 삭제 (R2)
- `POST /api/pdf/parse` — PDF 문제 추출 + 이미지 추출

## 환경변수

### 저작도구 (author-tool/.env)
```
PORT=3001
GEMINI_API_KEY=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=korea-history-data
R2_PUBLIC_URL=
VERCEL_DEPLOY_HOOK_URL=
```

### 웹사이트 (Vercel Environment Variables)
```
R2_PUBLIC_URL=   # prebuild 시 R2에서 데이터 다운로드용
```

## 주의사항

- pdf-parse v2: `new PDFParse({ data: buffer })` → `.load()` → `.getText()` → `.text`
- PDF 이미지 추출에 Python 필요: `pip install PyMuPDF Pillow`
- Gemini 3.1 Pro bbox 감지: 반드시 `gemini-3.1-pro-preview` 모델 사용
- 웹사이트 빌드 시 R2_PUBLIC_URL 필수 (Vercel 환경변수)
- 웹사이트 로컬 dev: .data-cache/ 없으면 ../data/questions/ fallback
- 노트 데이터는 R2에 없음, data/notes/에서만 읽음 (로컬/git)
- Tailwind CSS v4: 커스텀 CSS는 반드시 `@layer base` 또는 `@layer components` 안에 작성
- `@keyframes`는 `@layer` 밖에 배치 (CSS 스펙)

## 언어

- 사용자 인터페이스: 한국어
- 코드/커밋: 영어
