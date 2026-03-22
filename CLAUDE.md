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
├── data/card-news/        # 카드뉴스 저장 인덱스 (index.json)
├── data/images/           # 문제 이미지 (R2 업로드 + 로컬 백업)
├── scripts/               # 유틸리티 스크립트
├── design/                # 디자인 참고 파일
├── docs/                  # 프로젝트 문서
│   ├── marketing-strategy.html        # 마케팅 전략 보고서 v1
│   ├── marketing-plan-community.html  # 커뮤니티 마케팅 종합 플랜
│   └── card-news-feature-plan.html    # 카드뉴스 생성 기능 기획서
├── author-tool/           # 저작도구 (별도 앱, Railway 배포)
│   ├── server/            # Express API
│   │   ├── services/      # card-news, note-card-news, notes, r2, gemini 등
│   │   └── routes/        # exam, question, card-news, notes 등
│   └── src/               # React + Vite 프론트엔드
│       ├── features/      # exam, question, generator, card-news, notes
│       └── components/    # Layout, Sidebar (탭: 시험/마케팅)
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

### 사이드바 탭 구조
- **📚 시험 탭**: 시험 목록, 검색/정렬, + 새 시험, AI 생성
- **📢 마케팅 탭**: 카드뉴스 생성/갤러리, 요약노트 관리

### 카드뉴스 생성
- **기출 카드뉴스**: 문제 선택 → AI 후킹/해설 → satori PNG 4장 (후킹→문제→정답→CTA)
  - 배경 이미지 업로드 가능 (없으면 시대별 그라데이션)
  - 기존 해설 데이터를 AI에 전달 (지문이 이미지라서 content만으로 부족)
- **요약노트 카드뉴스**: 노트 선택 → AI 장면 구성 → Gemini 웹툰 이미지 생성
  - 이미지 모델 선택 가능 (Flash Image / Pro Image)
- **카드뉴스 갤러리**: R2에 자동 저장, 목록/미리보기/삭제

### 요약노트 관리
- 87개 노트 목록 (시대 필터, 검색)
- HTML 미리보기 + 키워드 표시
- 제목 편집 (더블클릭)

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
- satori + @resvg/resvg-js (텍스트 카드뉴스 PNG)
- Cloudflare R2 (카드뉴스 저장)
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
- 요약노트에 "자막", "YouTube", "강의" 등 출처 언급 절대 금지
- Tailwind CSS v4: `@layer base/components` 안에 작성, `@keyframes`는 밖에
- 웹사이트 빌드 시 R2_PUBLIC_URL 필수
- 노트 데이터는 R2에 없음, data/notes/에서만 읽음 (로컬/git)
- YouTube 타임스탬프 데이터는 git으로 관리 (web/data/)
- OG 이미지 JSX에서 변수 삽입 시 반드시 템플릿 리터럴 사용 (satori 제약)
- satori에서 children 배열이 있는 div에는 반드시 `display: flex` 필요
- exam-order.json이 비어있을 수 있음 → 카드뉴스는 디렉토리 스캔으로 시험 목록 로드
- Next.js 16: params는 Promise → `await params` 필수 (page.tsx, opengraph-image.tsx)

## 언어
- 사용자 인터페이스: 한국어
- 코드/커밋: 영어
