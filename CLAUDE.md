# 기출노트 한능검 — 한국사능력검정시험 학습 플랫폼

## 도메인
- **웹사이트**: https://gcnote.co.kr (Vercel)
- **저작도구**: Railway 배포
- **데이터**: Cloudflare R2
- **게시판 DB**: Supabase PostgreSQL

## 프로젝트 구조

모노레포 — Expo 앱(메인), 저작도구(author-tool), SEO 웹사이트(web) 세 개의 앱이 공존.

```
korea_history/
├── app/                   # Expo Router 페이지 (메인 앱)
├── components/            # Expo 공용 컴포넌트
├── hooks/                 # Expo 커스텀 훅
├── lib/                   # Expo 유틸리티
├── data/questions/        # 시험 데이터 JSON (로컬 + R2 동기화)
│   ├── exam-{N}.json      # { exam: Exam, questions: Question[] } (40~77회)
│   ├── exam-order.json    # 시험 순서 (ID 배열) — 비어있을 수 있음
│   └── keywords.json      # 키워드 → 문제 ID 매핑 (3,800+)
├── data/notes/            # 요약노트 JSON (87개)
│   ├── index.json         # 노트 메타데이터 인덱스
│   └── {sectionId}.json   # 개별 노트 (s1-01 ~ s7-16)
├── data/contents/         # 멀티채널 컨텐츠 JSON (index.json + ct-{id}.json)
├── data/card-news/        # 카드뉴스 저장 인덱스 (index.json, 레거시)
├── data/images/           # 문제 이미지 (R2 업로드 + 로컬 백업)
├── scripts/               # 유틸리티 스크립트
├── design/                # 디자인 참고 파일
├── docs/                  # 프로젝트 문서
│   ├── marketing-strategy.html        # 마케팅 전략 보고서 v1
│   ├── marketing-plan-community.html  # 커뮤니티 마케팅 종합 플랜
│   └── card-news-feature-plan.html    # 카드뉴스 생성 기능 기획서
├── author-tool/           # 저작도구 (별도 앱, Railway 배포)
│   ├── server/            # Express API
│   │   ├── services/      # card-news, note-card-news, notes, r2, gemini, content, prompt-builder 등
│   │   └── routes/        # exam, question, card-news, notes, content 등
│   └── src/               # React + Vite 프론트엔드
│       ├── features/      # exam, question, generator, card-news, notes, content
│       └── components/    # Layout, Sidebar (탭: 시험/컨텐츠)
├── web/                   # SEO 웹사이트 (Next.js, Vercel 배포)
│   ├── app/               # App Router 페이지
│   │   ├── layout.tsx     # 루트 레이아웃 (GA4, 카카오 SDK, 네이버 인증)
│   │   ├── page.tsx       # 메인 (배너 + 퀵액션 + 최신기출 + 키워드)
│   │   ├── opengraph-image.tsx  # 메인 OG 이미지 (정적)
│   │   ├── exam/          # 기출문제 (SSG, 1,900+ 페이지 + OG 이미지)
│   │   ├── notes/         # 요약노트 (SSG, 87 페이지 + OG 이미지)
│   │   ├── study/         # 학습하기 (맞춤형, 키워드별, 학습세션)
│   │   ├── wrong-answers/ # 오답노트 (CSR, localStorage)
│   │   ├── my-record/     # 내 기록 (점수, 급수, 약점 분석)
│   │   ├── board/         # 게시판 (Supabase, 자유/건의/공지)
│   │   ├── admin/banners/ # 배너 관리 (비밀번호 보호)
│   │   ├── api/           # API Routes (board, banners, study)
│   │   ├── privacy/       # 개인정보처리방침
│   │   └── terms/         # 이용약관
│   ├── components/        # Header, Footer, QuestionCard, ShareButtons 등
│   ├── lib/               # data.ts, notes.ts, seo.ts, supabase.ts, youtube.ts 등
│   └── data/              # youtube-videos.json, note-lectures.json
└── docs/                  # 프로젝트 문서
```

## 배포 아키텍처

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  저작도구    │────▶│ Cloudflare R2│◀────│  웹사이트   │
│  (Railway)  │     │ (데이터+이미지│     │  (Vercel)   │
│             │     │  +카드뉴스)   │     │             │
└─────────────┘     └──────────────┘     └─────────────┘
                                               │
                    ┌──────────────┐            │
                    │  Supabase    │◀───────────┘
                    │ (게시판+배너) │
                    └──────────────┘
```

## 핵심 기능 (웹사이트)

### 학습 시스템
- **회차별 풀기**: 40~77회 시험 (1,900+ 문항)
- **맞춤형 학습**: 시대 × 유형 체크박스 선택 → 학습 세션
- **키워드 학습**: 3,800개 키워드 체크박스 → 학습 세션
- **학습 세션** (`/study/session`): 선택한 문제 랜덤 셔플, 진행률, 네비게이터

### 문제 풀이 UX
- MZ 감성 디자인: 선지 3D 프레스 효과, 정답 confetti, 오답 shake
- 정답 확인 시 AI 해설 + YouTube 영상 해설 (최태성 1TV, 37개 회차)
- 문제 → 지문 이미지 → 선지 순서 (실제 시험지 형식)
- **공유 버튼**: 카카오톡 공유, 링크 복사, 네이티브 공유 (모바일)

### 요약노트
- 87개 시대별 노트 (203,922자, 웹검색 기반 보강)
- 최태성 강의 영상 embed (124개 영상 매칭)
- "관련 기출 풀기" 버튼 → 학습 세션
- 데스크톱: 왼쪽 사이드바 + 본문, 모바일: 토글

### YouTube 연동
- **해설 영상**: 37개 회차 × 50문제 = 1,850개 타임스탬프 (auto-caption DP 정렬)
- **강의 영상**: 124개 최태성 강의 → 87개 노트에 매칭
- 데이터: `web/data/youtube-videos.json`, `web/data/note-lectures.json`

### 게시판 (Supabase)
- 자유/건의/공지 3개 탭
- 공지: 관리자 비밀번호 모달로 인증
- 글 삭제: 작성 시 설정한 비밀번호로

### 배너 시스템
- 메인 페이지 롤링 캐러셀 (16:9, 자동 회전)
- `/admin/banners`에서 관리 (이미지 업로드, 순서, 속도 조절)
- Supabase Storage + DB

### 기록 시스템 (localStorage)
- **오답노트**: 틀린 문제 자동 수집, 날짜/시간 표시, 복습 세션
- **내 기록**: 회차별 점수/급수/날짜, 약점 분석 (시대/유형)
- **시험 기록**: 결과 페이지에서 자동 저장, 급수 판정 (80%=1급, 70%=2급, 60%=3급)

### OG 이미지 (SNS 공유 썸네일)
- **빌드 시 정적 생성** (SSG, 4,100+ 이미지)
- 메인/시험/문제/노트 페이지별 OG 이미지
- satori (Next.js ImageResponse) 사용
- 주의: JSX에서 `제{n}회` → `` {`제${n}회`} `` 템플릿 리터럴 필수 (satori multi-children 에러 방지)

## 핵심 기능 (저작도구)

### 사이드바 구조
- **헤더**: "기출노트 저작도구"
- **프로젝트 셀렉터**: 프로젝트 추가/삭제, 열기/접기 (기본: 한국사능력검정시험)
- **프로젝트 내 탭**: 📋 시험 | 📝 요약노트 | ✏️ 컨텐츠
- 프로젝트 데이터: `data/projects/index.json`

### 멀티채널 컨텐츠 시스템 (NEW)
한 주제로 여러 채널용 컨텐츠를 동시 생성하는 시스템.

**워크플로우**: 소스 선택 → 기본글 작성/AI 생성 → 채널별 AI 변환
- **소스 타입**: 기출문제, 요약노트, 자유 주제
- **채널**: 블로그(네이버 SEO), 인스타 카드뉴스, 스레드, 롱폼 대본, 숏폼 대본
- **AI 생성**: Gemini API + SSE 스트리밍, 채널별 모델 선택 가능
- **저장**: `data/contents/` (JSON) + R2 (이미지)

**블로그 키워드 & SEO 시스템**:
- 네이버 검색광고 API 연동 (키워드 검색량, 경쟁률 조회)
- AI 키워드 추천 (Gemini) + 수동 키워드 추가
- 키워드 선택 → SEO 최적화된 블로그 AI 생성
- 생성 후 네이버 SEO 분석 (9개 카테고리, 100점 만점)
- 블로그 카드: 이미지+텍스트 통합, 드래그 정렬, 추가/삭제, 이미지 스타일 선택

**데이터 구조**: Content → BaseArticle(1:1) → ChannelContent[](1:N × 5채널)
- 스펙: `docs/superpowers/specs/2026-03-23-multi-channel-content-design.md`
- 플랜: `docs/superpowers/plans/2026-03-23-multi-channel-content.md`

**서버 파일**:
- `server/services/content.service.ts` — CRUD (index.json + ct-{id}.json)
- `server/services/prompt-builder.ts` — 6개 채널별 프롬프트 템플릿
- `server/services/content-generator.service.ts` — AI 생성 오케스트레이션 + SSE
- `server/routes/content.routes.ts` — `/api/contents` REST API
- `server/services/naver-keyword.service.ts` — 네이버 검색광고 API 연동
- `server/services/seo-scorer.ts` — 네이버 SEO 점수 계산 (100점)
- `server/routes/blog-tools.routes.ts` — `/api/blog-tools` (키워드 추천, 검색량, SEO 분석)
- `server/services/project.service.ts` — 프로젝트 CRUD
- `server/routes/project.routes.ts` — `/api/projects`

**프론트엔드 파일**:
- `src/features/content/` — api, hooks, components
- 6개 탭 패널: BaseArticle, Blog(키워드+SEO), CardNews, Threads, LongForm, ShortForm
- `src/features/notes/components/NoteEditorPanel.tsx` — 요약노트 HTML 에디터

### 레거시 카드뉴스 (기존, 유지)
- **기출 카드뉴스**: satori PNG 4장 (card-news.service.ts)
- **요약노트 카드뉴스**: Gemini 웹툰 이미지 (note-card-news.service.ts)
- **카드뉴스 갤러리**: R2 저장 (card-news-storage.service.ts)
- 기존 API 라우트(`/api/card-news/`)는 소스 데이터 조회용으로도 재활용

### 요약노트 에디터
- 87개 노트 (시대별 그룹, 검색)
- 전체 HTML 편집기 (contentEditable + 툴바: B/I/H2/H3/UL/OL/이미지/링크)
- 이미지 업로드/삭제, 키워드 뱃지 표시
- 자동 저장 (500ms debounce), 문자수 표시

## 기술 스택

### 웹사이트 (web/) — Vercel 배포
- Next.js 16+ (App Router), Tailwind CSS v4
- Supabase (게시판 PostgreSQL + Storage)
- Google Analytics 4 (G-CJ7V236NQV)
- Kakao JS SDK (공유 기능)
- 네이버 서치어드바이저 인증 완료

### 저작도구 (author-tool/) — Railway 배포
- Express + Vite middleware, React 18, TailwindCSS, Zustand
- Gemini API (텍스트 + 이미지 생성)
- 네이버 검색광고 API (키워드 검색량/경쟁률)
- satori + @resvg/resvg-js (텍스트 카드뉴스 PNG)
- Cloudflare R2 (카드뉴스 + 컨텐츠 이미지 저장)
- Vercel Deploy Hook

## 환경변수

### 웹사이트 (Vercel)
```
R2_PUBLIC_URL=
NEXT_PUBLIC_SUPABASE_URL=https://uonznnypdnerdigfyfci.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=https://gcnote.co.kr
NEXT_PUBLIC_KAKAO_JS_KEY=
ADMIN_PASSWORD=
```

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
NAVER_API_LICENSE_KEY=
NAVER_API_SECRET_KEY=
NAVER_API_CUSTOMER_ID=
```

## SEO
- 도메인: gcnote.co.kr
- sitemap.xml 자동 생성 (2,100+ URL)
- robots.txt (/admin, /api, /study/session 차단)
- 모든 페이지 "한능검" 키워드 포함 타이틀
- Google Search Console + 네이버 서치어드바이저 등록
- JSON-LD (Quiz, BreadcrumbList)
- OG 이미지 (4,100+ 정적 생성)

## 주의사항
- 요약노트 및 컨텐츠 생성 프롬프트에 "자막", "YouTube", "강의" 등 출처 언급 절대 금지
- Tailwind CSS v4: `@layer base/components` 안에 작성, `@keyframes`는 밖에
- 웹사이트 빌드 시 R2_PUBLIC_URL 필수
- 노트 데이터는 R2에 없음, data/notes/에서만 읽음 (로컬/git)
- YouTube 타임스탬프 데이터는 git으로 관리 (web/data/)
- OG 이미지 JSX에서 변수 삽입 시 반드시 템플릿 리터럴 사용 (satori 제약)
- satori에서 children 배열이 있는 div에는 반드시 `display: flex` 필요
- exam-order.json이 비어있을 수 있음 → 카드뉴스는 디렉토리 스캔으로 시험 목록 로드
- Next.js 16: params는 Promise → `await params` 필수 (page.tsx, opengraph-image.tsx)
- 컨텐츠 데이터는 `data/contents/`에 저장 (index.json + ct-{id}.json), 이미지는 R2 `contents/{id}/` 경로
- 컨텐츠 SSE 생성: `POST /api/contents/:id/generate/:channel` → `data: {"type":"chunk|complete|error",...}`
- 컨텐츠 서비스의 서버 타입(content.service.ts)은 `any[]` — 프론트 타입(content-types.ts)이 정확한 타입 정의

## 언어
- 사용자 인터페이스: 한국어
- 코드/커밋: 영어
