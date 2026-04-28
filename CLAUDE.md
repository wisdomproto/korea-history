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
├── data/contents/         # (레거시) 과거 로컬 저장본 잔재 — 현재는 R2 `contents/` 사용
├── data/card-news/        # 카드뉴스 저장 인덱스 (index.json, 레거시)
├── data/cardnews-drafts/  # 87편 카드뉴스 design-guide-A v1 JSON (s1-01 ~ s7-16) + _style-guide.json
├── data/threads-drafts/   # 스레드 배치 (md + csv, 수동 운영용)
├── data/images/           # 문제 이미지 (R2 업로드 + 로컬 백업)
├── scripts/               # 유틸리티 스크립트
├── design/                # 디자인 참고 파일
├── docs/                  # 프로젝트 문서
│   ├── multi-exam-hub-strategy.html   # ⭐ 통합 허브 전략 v2 (대표 보고용 — 한눈에 + 정밀 모델)
│   ├── marketing-strategy.html        # 마케팅 전략 보고서 v1
│   ├── marketing-plan-community.html  # 커뮤니티 마케팅 종합 플랜
│   └── card-news-feature-plan.html    # 카드뉴스 생성 기능 기획서
├── author-tool/           # 저작도구 (별도 앱, Railway 배포)
│   ├── server/            # Express API
│   │   ├── services/      # card-news, notes, r2, r2-json, gemini, content, ga4, gsc, supabase, weekly-report, cron, publish-job, monitored-comments, ad-campaign, competitor, strategy-ai, idea-generator 등
│   │   └── routes/        # exam, question, card-news, notes, content, analytics, env-status, ideas, publish-jobs, comments, ad-campaigns, channel-analytics, competitors, strategy 등
│   ├── supabase/migrations/  # SQL (weekly_reports만 — 그 외 마케팅 데이터는 R2 JSON)
│   └── src/               # React + Vite 프론트엔드
│       ├── features/      # exam, question, generator, card-news, notes, content, analytics, settings, ideas, publish, monitoring, ads, channel-analytics, competitors, strategy, marketing
│       └── components/    # Layout, Sidebar (탭: 시험/노트/마케팅), sidebar/MarketingSubmenu
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
                    ┌──────────────────────┐   │
                    │  Supabase PostgreSQL │◀──┘
                    │ 게시판+배너+주간리포트 │
                    └──────────────────────┘
                              ▲
                              │
                    ┌──────────────┐
                    │ node-cron    │  매주 월 07:00 KST
                    │ (author-tool)│  → GA4 수집+Gemini 요약
                    └──────────────┘
```

## 다중 시험 플랫폼 (2026-04-26)

한능검 단일 → **728개 R2 자격시험 + 9급/7급 공무원 + 직렬별** 통합 학습 허브로 확장.

### 데이터 구조
- **카테고리** (`data/exam-types/categories.json`): 7개 — civil/cert/driver/corporate/language/exam(수능)/other(기타). 각 카테고리는 subcategory 리스트 보유 (cert는 16개 subcategory).
- **ExamType** (`data/exam-types/index.json`): **547개** — 한능검 + 자격증 478개 + 공무원 직렬 자식 69개. 신규 필드: `isContainer` (직렬로 분리된 부모), `parentExamId` (직렬 자식의 부모 참조), `jobSeries` (직렬 ID).
- **Subject** (`data/subjects/index.json`): **624개** — R2 727개 stem 전수 매핑 (754 SubjectRef, 한국사 reuse 27건 포함).
- **R2 stem 캐시** (`cbt_data/_r2_categories.json`): R2 `_categories.json`을 로컬 미러링 (727 entries). canonical stem은 `code` 필드 (하이픈 separator).

### 직렬 분리
- **9급 국가직** (`civil-9-national`, isContainer): 24직렬 자식 (일반행정/세무/관세/통계/검찰사무/교정/보호/사회복지/직업상담/교육행정/외무영사/선거행정/건축/토목/일반기계/전기/통신기술/화공/전산/정보보호/임업/식품위생/조경/방재안전).
- **9급 지방직** (`civil-9-local`, isContainer): 21직렬.
- **9급 지방직 서울시** (isContainer): 24직렬.
- 각 직렬 자식 = 공통 3과목 (한국사/국어/영어) + 직렬 전공 1-5과목.
- **7급/경찰/소방/계리직** — R2에 직렬 정보 없어 단일 ExamType 유지.

### URL 구조 (평면)
- 단일 시험 / 직렬: `/[examSlug]` (예: `/한능검`, `/9급-국가직-일반행정`, `/변리사`)
- 과목 랜딩: `/[examSlug]/[subjectSlug]` (예: `/9급-국가직-일반행정/한국사`)
- 부모 컨테이너: `/[examSlug]` 으로 가면 **JobSeriesSection** (직렬 카드 24개)
- sub-routes (`/exam`, `/notes`, `/wrong-answers`, `/my-record`)는 직렬 ExamType 단위

### 3-level 트리 UI
- **헤더 ExamSelector** (`web/components/ExamSelector.tsx`): 카테고리 → 부모 시험 → 직렬 → 과목 (4-level expand).
- **OtherExamsTree** (`web/components/OtherExamsTree.tsx`): 홈 하단 트리, 동일 4-level 구조 (JobSeriesRow 컴포넌트 추가).
- **부모 페이지** (`web/app/[examSlug]/page.tsx`): `exam.isContainer` 면 SubjectsSection 대신 **JobSeriesSection** (직렬 카드 그리드).
- `getCategoriesWithExams()`는 자식 직렬 제외 (`!e.parentExamId`) — 트리 top-level에 부모만 노출.

### Lib helper (`web/lib/exam-types.ts`)
- `getJobSeriesChildren(parentId)` — 부모 ExamType의 직렬 자식 리스트
- `getParentExamType(child)` — 직렬 자식의 부모 ExamType

### 데이터 파이프라인 스크립트
- `scripts/wire-all-r2-stems.mjs` — R2 727 stem → ExamType/Subject 자동 분류 + 머지
- `scripts/cleanup-labels-slugs.mjs` — 라벨 정규화 (불완전 괄호 fix), slug 특수문자 제거 (`,` `ㆍ` 등), shortLabel 14자 + … 축약, 중복 slug 해결
- `scripts/dedup-subject-refs.mjs` — 같은 ExamType 내 동일 subjectId 중복 제거 (한국사 우선순위)
- `scripts/split-civil-by-job-series.mjs` — 공무원 부모 시험을 직렬 자식으로 분리
- `scripts/audit-all-routes.mjs` — 데이터 무결성 + HTTP probe (1,645 라우트 전수 점검)

## 핵심 기능 (웹사이트)

### 디자인 시스템 (2026-04-18 리디자인)
- **디자인 언어**: 프로모 영상 톤 — warm cream `#F5EFE4` + deep ink `#1F1A14` + amber `#B45309` + teal `#0D9488`
- **타이포그래피**: Noto Serif KR (헤드라인) + Pretendard Variable (본문) + JetBrains Mono (라벨), 폰트는 `app/layout.tsx` `<head>`에 `<link>` 로드
- **디자인 토큰**: `app/globals.css` `:root`에 `--gc-*` CSS 변수 (`--gc-bg`, `--gc-ink`, `--gc-amber`, `--gc-teal`, `--gc-paper`, `--gc-hairline` 등)
- **폰트 유틸**: `.font-serif-kr`, `.font-sans-kr`, `.font-mono-kr` globals에 정의
- **풀블리드 유틸**: `.gc-fullbleed` — `layout.tsx`의 `max-w-6xl` 컨테이너를 viewport 전체 너비로 브레이크아웃 (랜딩 페이지가 사용)
- **랜딩 페이지** (`app/page.tsx`): Hero(세리프 84px + Q카드↔노트카드 연결 콜라주) → Stats Band → Feature Grid 2×2 → Exam Preview(브라우저 프레임) → Notes Preview(시대 스택) → Linked Preview(MATCH 시각화) → Latest Exams + Keywords → Pricing Band(다크 ink) → SEO Prose
- **Header**: 세리프 "기출노트" + 앰버 "한능검" 워드마크, 액티브 nav에 앰버 밑줄, 검색바(⌘K, ≥1024px), "지금 풀기" 필 CTA
- **Footer**: cream deep 배경 + 3컬럼(학습/회차별/정보) + 모노 카피라이트
- **모바일 반응형**: 모든 섹션 `px-5 sm:px-6 md:px-8` + `py-14 md:py-20`, Hero/Exam/Notes preview는 1-col → `md:`/`lg:` 2-col, Stats는 `grid-cols-2 md:grid-cols-4`, Linked Preview 연결선은 모바일에서 90° 회전

### 학습 시스템
- **회차별 풀기**: 40~77회 시험 (1,900+ 문항)
- **맞춤형 학습**: 시대 × 유형 체크박스 선택 → 학습 세션
- **키워드 학습**: 3,800개 키워드 체크박스 → 학습 세션
- **학습 세션** (`/study/session`): 선택한 문제 랜덤 셔플, 진행률, 네비게이터

### 문제 풀이 UX
- MZ 감성 디자인: 선지 3D 프레스 효과, 정답 confetti + 스파클 버스트 + 점수 팝업, 오답 shake + 화면 플래시
- **사운드 효과**: Web Audio API (외부 파일 없음) — 선택 클릭음, 정답 아르페지오, 오답 버저 (`web/lib/sounds.ts`)
- 정답 확인 시 AI 해설 + YouTube 영상 해설 (최태성 1TV, 37개 회차)
- **관련 요약노트 링크**: 정답 확인 후 문제 시대(era) → 노트 섹션 매핑으로 해당 시대 요약노트 바로가기
- 문제 → 지문 이미지 → 선지 순서 (실제 시험지 형식)
- **공유 버튼**: 카카오톡 공유, 링크 복사, 네이티브 공유 (모바일)

### 요약노트
- 87개 시대별 노트 (203,922자, 웹검색 기반 보강)
- 최태성 강의 영상 embed (124개 영상 매칭)
- "관련 기출 풀기" 버튼 → 학습 세션
- 데스크톱: 왼쪽 사이드바 + 본문, 모바일: 토글
- **SEO 강화**: keywords meta(10개 변형) + **Article JSON-LD** (`learningResourceType:"요약노트"`, about, publisher, isAccessibleForFree) + **VideoObject JSON-LD** (강의 iframe별 thumbnail/embedUrl/duration) — `web/app/notes/[noteId]/page.tsx`

### YouTube 연동
- **해설 영상**: 37개 회차 × 50문제 = 1,850개 타임스탬프 (auto-caption DP 정렬)
- **강의 영상**: 124개 최태성 강의 → 87개 노트에 매칭
- 데이터: `web/data/youtube-videos.json`, `web/data/note-lectures.json`
- **이벤트 트래킹** (`web/components/YouTubeEmbed.tsx`): IFrame `enablejsapi=1` + postMessage 리스너로 재생 상태 수신 → `gtag('event','video_play',{…})`, `video_complete`. context: `surface` (question/note), `question_id`/`exam_id`/`question_number`/`note_id`/`section_id`. QuestionCard와 노트 페이지 두 iframe 모두 교체.

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
- **헤더**: "기출노트 저작도구" + « 접기 버튼 + 📊 분석 버튼
- **접기/펼치기**: « 버튼으로 사이드바 토글 (접히면 아이콘만 보이는 미니바 w-12)
- **기본 진입 화면**: GA4 Analytics Dashboard (프로젝트 선택 전)
- **프로젝트 셀렉터**: 프로젝트 추가/삭제, 열기/접기 (기본: 한국사능력검정시험)
- **프로젝트 내 탭**: 📋 시험 | 📝 노트 | 📣 마케팅
- 마케팅 탭 클릭 시 → MarketingSubmenu 노출 (프로젝트 설정 / 키워드·아이디어 / 콘텐츠 생성 / 발행 / 모니터링 / 광고 / 사이트 분석 / 채널 분석 / 경쟁사 / 마케팅 전략)
- 프로젝트 데이터: `data/projects/index.json` (brand · writingGuide · referenceFiles · channelCredentials · savedKeywords · savedIdeas · strategy 등 모든 설정 포함)
- 상태: `editor.store.ts` (sidebarCollapsed, sidebarSection, marketingSubmenu)

### 멀티채널 컨텐츠 시스템 (NEW)
한 주제로 여러 채널용 컨텐츠를 동시 생성하는 시스템.

**워크플로우**: 소스 선택 → 기본글 작성/AI 생성 → 채널별 AI 변환
- **소스 타입**: 기출문제, 요약노트, 자유 주제
- **채널**: 블로그(네이버 SEO), 인스타 카드뉴스, 스레드, 롱폼 대본, 숏폼 대본
- **AI 생성**: Gemini API + SSE 스트리밍, 채널별 모델 선택 가능
- **저장**: R2 (`contents/index.json` + `contents/ct-{id}.json` + `contents/{id}/images/*`)

**블로그**:
- 네이버 검색광고 API 연동 (키워드 검색량, 경쟁률 조회)
- AI 키워드 추천 (Gemini) + 수동 키워드 추가
- 키워드 선택 → SEO 최적화된 블로그 AI 생성
- 생성 후 네이버 SEO 분석 (9개 카테고리, 100점 만점)
- 블로그 카드: 모든 카드에 텍스트+이미지, 드래그 정렬, 추가/삭제, 이미지 스타일 선택
- 재생성 시 기존 교체 (push → replace), 삭제 버튼

**카드뉴스 (인스타그램)**:
- 📸 **자동 발행 (Instagram Graph API)**: 슬라이드 → html2canvas PNG → R2 업로드 → 캐러셀 POST → 발행 (최대 10장)
- 캔버스 기반 슬라이드 에디터 (4:5 비율 카드)
- 6개 빌트인 템플릿 + 커스텀 프리셋 저장/삭제 (R2)
- 왼쪽 스타일 패널: 배경색, 제목/본문 폰트(크기/색상/볼드/정렬/위치/그림자), 이미지 Y 위치 → 전체 슬라이드 일괄 반영
- 슬라이드별: 제목/본문 인라인 편집, 이미지 프롬프트 표시
- AI 이미지: 스타일 선택(6종), 비율 선택(7종), 모델 선택, Gemini imageConfig.aspectRatio
- 이미지 생성/저장/삭제/재생성 버튼 (per slide), 전체 배치 생성 + 중지
- 블로그 카드 기반 생성 (블로그 있으면 블로그 소스, 없으면 기본글)
- 로컬 상태 + debounce 저장 (race condition 방지)

**카드뉴스 design-guide-A v1** (2026-04-26~27, 87편 작성 완료):
- 스키마: `data/cardnews-drafts/{noteId}.json` — `data.{meta, cover, keywords, facts, people, impact, outro}` (6장 슬라이드)
- 톤: 페이퍼 베이지 `#F2EDE3` + Noto Serif KR + 앰버 `#C77B3D` 액센트
- 6장 구성: cover (4:3 풀블리드 이미지) → keywords (4행 테이블) → facts (timeline) → people (3행 테이블) → impact (4행 테이블) → outro (TIP + 사이트 가치제안 + CTA 박스)
- **모든 본문 슬라이드 통일된 row-table 형식**: 좌측 150px anchor (KW/P/I 01) + 우측 (primary label 42px serif + secondary desc 30px sans) + 1px hairline 분리선
- **세트 내 제목 사이즈 통일**: `computeCommonTitleSize()` — 6개 슬라이드 중 가장 긴 제목 기준
- **fitTitle()**: 1줄 (108~84px) 또는 2줄 (자연 분할점 기반, 100~64px) auto-fit
- 제목/본문 사이: 짧은 앰버 accent bar + 검정 1px hairline (전체폭) 더블 디바이더
- 푸터: "● 기출노트 한능검" (32px serif) + "gcnote.co.kr" (30px mono)
- 핵심 파일: `cardnews/SlideCanvas.tsx` (메인 렌더러, fitTitle/renderStructuredBody/computeCommonTitleSize export), `cardnews-export.ts` (html2canvas 1080×1350 PNG)
- 운영 스크립트:
  - `seed-korean-history-contents.mjs` — 87 노트로 콘텐츠 시드
  - `fill-baseArticle-from-notes.mjs` — baseArticle에 노트 HTML 채움
  - `sync-cardnews-to-authortool.mjs` — drafts → IG 채널 PUT (slide.imageUrl 보존, 경로 `data.instagram[]`)
  - `gen-cardnews-cover-images.mjs` — Gemini 2.5 Flash Image 4:5 87 커버 일괄 생성
  - `validate-cardnews-drafts.mjs` — 87 드래프트 글자수/항목수/era 일관성 검증
  - `seed-cardnews-templates.mjs` — 디자인 가이드 A 빌트인 템플릿 4개
  - `preview-cardnews.mjs` — Puppeteer로 6장 미리보기 캡처 (모달 800/1080 px 확장)
  - `batch-export-cardnews.mjs` — 87 × 6 PNG 캡처 + zip 생성 (`scripts/output/cardnews-87.zip`)
  - `export-cardnews-captions.mjs` — 87 캡션 + 해시태그 → CSV (UTF-8 BOM)

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
- `server/services/project.service.ts` — 프로젝트 CRUD (type: korean-history | cbt)
- `server/routes/project.routes.ts` — `/api/projects`
- `server/services/cardnews-template.service.ts` — 카드뉴스 프리셋 CRUD (R2)
- `server/routes/cardnews-template.routes.ts` — `/api/cardnews-templates`
- `server/services/instagram.service.ts` — Instagram Graph API (카드뉴스 캐러셀 발행)
- `server/routes/instagram.routes.ts` — `/api/instagram/publish` (multipart), `/status`

**프론트엔드 파일**:
- `src/features/content/` — api, hooks, components
- 6개 탭 패널: BaseArticle, Blog(키워드+SEO), CardNews, Threads, LongForm, ShortForm
- `src/features/notes/components/NoteEditorPanel.tsx` — 요약노트 HTML 에디터
- `src/features/summary-notes/components/SummaryNoteViewer.tsx` — CBT 요약노트 뷰어

**리팩토링 구조** (2026-04-08):
- `src/components/Layout.tsx` (116줄) → `ViewRouter.tsx` + `useExamActions.ts`
- `src/components/Sidebar.tsx` (256줄) → `sidebar/` (ProjectSelector, ExamList, CbtExamList, NotesList, ContentList)
- `src/features/content/components/CardNewsPanel.tsx` (532줄) → `cardnews/` (SlideCanvas, SlideCard, SavedTemplateCard, NewPresetInput, ImageStyleInput, SlidePreviewModal, cardnews-export)
- `src/features/content/components/BlogPanel.tsx` (272줄) → `blog/` (KeywordPanel, BlogCardEditor, BlogPreview)

### CBT 시험 시스템
- **728개 자격시험**, 15,767개 시험, 1,004,324개 문제 (R2: `cbt/` prefix)
- 카테고리 브라우저: 검색 → 프로젝트 추가, 시험 목록 → 문제 에디터
- 문제 에디터: 지문(텍스트+이미지), 선지(텍스트+이미지), 정답 선택, 해설
- Auto-save (800ms debounce) + 저장 버튼 → R2에 저장
- 프로젝트 검색 + 가나다순 정렬
- 스크립트: `scripts/upload-cbt-to-r2.ts` (체크포인트 기반 이어하기), `scripts/register-cbt-projects.ts`
- 데이터 구조: `cbt_data/cbtdata.md` 참고
- 컨텐츠 프로젝트별 분리 (`Content.projectId`)

### 마케팅 슈트 (2026-04-25, ContentFlow 패턴 포팅)
사이드바 `📣 마케팅` 탭 → MarketingSubmenu에서 10개 메뉴 선택. ContentFlow의 3-column 레이아웃을 단순화해 단일 프로젝트 + 단일 작성자 환경에 맞게 구축.

**메뉴 → 컴포넌트 매핑** (`src/features/marketing/components/MarketingView.tsx`):
| 메뉴 | 컴포넌트 | 핵심 기능 |
|---|---|---|
| ⚙️ 프로젝트 설정 | `ProjectSettingsView` (4탭) | 브랜드/글쓰기 가이드/참고 자료/API 연동 — debounced patch |
| 💡 키워드/아이디어 | `IdeasView` (3탭) | Naver+GSC 리서치 → 저장 → AI 아이디어 보드 |
| 📝 콘텐츠 생성 | `ContentWorkspace` | 미들 ContentList + 라이트 ContentPanel (기존 채널 7개 + WordPress 스텁) |
| 🚀 발행 | `PublishView` + `NewJobModal` | WP/IG 예약·즉시·재시도, 매분 cron |
| 💬 모니터링 | `MonitoringView` + `CommentCard` | IG 댓글 sync + Gemini 감정/답글 초안 |
| 📣 광고 관리 | `AdsView` + `CampaignModal` | 7개 플랫폼 수동 캠페인, KPI 자동 파생 |
| 📊 사이트 분석 | `AnalyticsView` (재활용) | 기존 GA4 대시보드 + 주간 리포트 |
| 📈 채널 분석 | `ChannelAnalyticsView` (4탭) | IG Insights 실시간, YouTube Data API, Threads/N블로그 스텁 |
| 🎯 경쟁사 | `CompetitorsView` + `GapAnalysisPanel` | YouTube + RSS 자동 수집, AI 주제 추출, 갭 분석 |
| 🧭 마케팅 전략 | `StrategyView` (6섹션) | ICP/JTBD/Funnel/ChannelMix/Calendar/OKR + AI 초안 6종 |

**저장소 결정** (옵션 A 적용, 2026-04-25):
- 새 마케팅 데이터는 **모두 R2 JSON** (`author-tool/{publish-jobs|monitored-comments|ads|competitors}/index.json`)
- 프로젝트 설정/전략/키워드/아이디어는 `data/projects/index.json`의 Project 필드로 통합
- Supabase는 **board + weekly_reports만 유지** (공개 쓰기 + 이미 운영 중)
- 신규 SQL 마이그레이션 없음 (publish_jobs/monitored_comments는 기획만 후 R2로 전환)

**범용 R2 JSON 헬퍼** (`server/services/r2-json.service.ts`): `readJson<T>` / `writeJson<T>` / `mutateList<T>` / `upsertById<T>` / `patchById<T>` / `removeById<T>` / `withLock` (단일 프로세스 내 lost-update 방지)

**핵심 서버 파일**:
- `server/services/{publish-job,publisher,wordpress,monitored-comments,comment-ai,comment-sync,ad-campaign,competitor,competitor-sync,competitor-ai,idea-generator,strategy-ai}.service.ts`
- `server/services/youtube-analytics.service.ts` — YouTube Data API v3 (API 키 기반, 채널 통계 + 최근 영상)
- `server/services/instagram.service.ts` 확장 — 댓글 fetch/reply, 계정 인사이트, 미디어별 인사이트
- `server/services/gsc.service.ts` — Google Search Console API (서비스 계정 공유 사용)
- `server/routes/{ideas,publish-jobs,comments,ad-campaigns,channel-analytics,competitors,strategy,env-status}.routes.ts`

**핵심 프론트 파일**:
- `src/features/{settings,ideas,publish,monitoring,ads,channel-analytics,competitors,strategy,marketing}/`
- 각 feature는 `types.ts` + `api/*.api.ts` + `hooks/*.ts` + `components/*.tsx` 패턴
- 공통 디바운스 patch: `useDebouncedPatch({ projectId, delay: 600 })` (settings/strategy 자동 저장)

**cron 확장** (`cron.service.ts`):
- 기존: 매주 월 07:00 KST `weekly-report` (Supabase 필요)
- 신규: 매분 `publish queue` (R2 필요) — 예약된 발행 작업 픽업/실행

**AI 활용 (Gemini)**:
- 콘텐츠: 기본글/블로그/카드뉴스/스레드/롱폼/숏폼 생성 (기존)
- 키워드: 시드 → 연관 추천 (Naver API와 결합)
- 아이디어: 키워드 + 브랜드 컨텍스트 → 콘텐츠 아이디어 N개
- 댓글: 감정 분석 + 의도 분류 + 답글 초안 (브랜드 톤 적용)
- 경쟁사: 콘텐츠 제목 → 주제/키워드 추출, 갭 분석
- 전략: ICP/JTBD/Funnel/ChannelMix/OKR/SeasonCalendar 초안 6종

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

### 로컬 LLM 요약노트 파이프라인 (실험 중)
**목적**: CBT 자격시험 728개 전체 요약노트 자동 생성 — API 비용 0 (로컬 GPU)
- **게이트웨이**: `C:\projects\gemma` Ollama wrapper (`http://localhost:8080`)
- **모델**: `qwen2.5:14b-instruct-q4_K_M` (~9GB, 4070 12GB에 적합)
- **파이프라인**: 추출(Qwen) → 시대 정규화 병합 → 주제별 개별 Polish(Qwen)
- **스크립트**: `author-tool/scripts/gemma-summary-korea.ts` (한국사 전용)
- **핵심 설계**:
  - Polish는 **주제 1개당 1회 호출** (배치 X — 구조 지시 준수 향상)
  - Topic 정규화 (`canonicalEra()`): 유사 topic을 시대명으로 병합 (37→11주제)
  - 시대순 정렬 (`eraRank()`): 선사→고조선→삼국→남북국→고려→조선→근대→현대
  - 한자 전수 제거 후처리 (CJK U+4E00~U+9FFF)
  - Fewshot HTML 예시 포함 프롬프트 (details/sub-details/table 구조)
- **테스트 결과** (한국사 73~77회, 250문제):
  - 소요: 추출 23분 + Polish 7분 = **30분/노트**
  - 품질: 시대순 11주제, 한자 0, 교과서 문체
  - 한계: 본문 평균 165자 (300자 목표 미달), subtopic 일부 누락
- **전체 추정**: 시험당 5회차 × 728시험 = 728노트 × 30분 = **~15일** ($0)

### GA4 Analytics Dashboard
분석 화면은 두 개 탭: **📊 실시간 대시보드** + **📅 주간 리포트**. `src/features/analytics/components/AnalyticsView.tsx` 가 탭 래퍼, 기존 `AnalyticsDashboard`는 실시간 탭으로 분리.

#### 📊 실시간 대시보드
- **기본 진입 화면**: 저작도구 열면 바로 사이트 현황 표시
- **GA4 Data API v1**: 서비스 계정 인증, 서버 사이드 호출
- **날짜별 트래픽**: 7일/30일 토글 + 주단위 ‹/› 네비게이션 (과거 기간 탐색, "오늘" 복귀)
  - 메트릭 전환 버튼: PV(초록), 사용자(보라), PV/사용자(시안), 체류시간(주황), PV당 체류(빨강)
  - 일별 바 차트 (주말 색상 구분), 호버 툴팁에 전 메트릭 표시
- **채널별 유입**: Organic/Direct/Referral/Social/Paid 수평 바 차트
- **인기 페이지 TOP 10**: 경로별 페이지뷰 테이블
- **UTM 캠페인**: source/medium별 세션 테이블
- **기기별**: 모바일/데스크톱/태블릿 비율 바 차트
- **시간대별**: 24시간 바 차트 + 피크 시간 표시
- **요일별**: 일~토 바 차트 (일=빨강, 토=파랑)
- **기간 프리셋**: 오늘/7일/30일/90일 + 시험 시즌 프리셋 (🔥 N회 시즌)
- **캐싱**: 하이브리드 (오늘=실시간, 과거=1시간 캐시), 수동 새로고침 지원
- **서버 파일**: `server/services/ga4.service.ts`, `server/services/exam-season.service.ts`, `server/routes/analytics.routes.ts`
- **프론트엔드**: `src/features/analytics/` (types, api, hooks, components 8개)

#### 📅 주간 리포트 (NEW)
**매주 월요일 07:00 KST** 자동 생성되어 Supabase에 저장되는 주간 GA4 스냅샷 + Gemini AI 인사이트.

- **저장**: Supabase `weekly_reports` 테이블 (unique `week_start`, `data` JSONB, `ai_summary` TEXT, `highlights` JSONB)
- **스케줄러**: `node-cron` — 기본 `0 7 * * 1 Asia/Seoul`, 환경변수 `WEEKLY_REPORT_CRON`/`WEEKLY_REPORT_TZ`/`WEEKLY_REPORT_ENABLED` 로 제어
- **수집 내용** (지난주 월~일, 전주 대비 변화율 포함):
  - KPI (sessions/users/pageViews/duration/bounce/engagement/newUsers)
  - 일별 추이 · 채널 · 기기 · Top 페이지 · 랜딩
  - 페이지 그룹별 PV + PV당 체류 (문제풀이/요약노트/학습세션 등 12개 그룹)
  - video_play/video_complete 이벤트 카운트
  - 가장 인기 회차의 문제별 완주 깔때기
- **AI 요약**: Gemini 2.5 Flash에 snapshot을 넘겨 "## 이번 주 하이라이트 / ## 사용자 행동 해석 / ## 다음 주 주목 가설" 3섹션 한국어 리포트 생성
- **UI**: 왼쪽 주차 카드 리스트(사용자/PV + 전주 대비 델타) + 오른쪽 상세 뷰 (하이라이트 5개, AI 인사이트, 일별 스파크라인, 채널 바, 영상 재생/완주율, 페이지 그룹 표, 랜딩 표, 회차 완주 깔때기)
- **"지금 생성" 버튼**: 지난주 기준 수동 재생성 (week_start unique로 upsert)
- **수동 백필**: `npx tsx scripts/weekly-report-backfill.ts [START END]`
- **서버 파일**:
  - `server/services/weekly-report.service.ts` — GA4 9개 쿼리 병렬 + 전주 비교 + Gemini 요약 + 하이라이트 파생
  - `server/services/supabase.service.ts` — service role 클라이언트
  - `server/services/cron.service.ts` — node-cron 스케줄러 (index.ts에서 `startCron()`)
  - `server/routes/weekly-report.routes.ts` — `GET /api/weekly-reports`, `GET /:weekStart`, `POST /generate`, `DELETE /:weekStart`
  - `supabase/migrations/weekly_reports.sql` — 테이블 + RLS + updated_at 트리거
- **프론트엔드**: `src/features/analytics/components/AnalyticsView.tsx` (탭 래퍼), `WeeklyReportList.tsx`, `WeeklyReportDetail.tsx`, `hooks/useWeeklyReports.ts`, `api/weekly-report.api.ts`, `types/weekly-report.types.ts`

#### 🚨 광고 확장 트리거 (2026-04-28)
분석 대시보드 상단 알림 카드. 셋 중 먼저 도달 시 큰 앰버 카드로 "광고 확장 검토 시점" 알람.
- **트리거 3개**: ① DAU 500 (GA4 어제 활성 사용자) ② 2026-05-26 도달 (첫 광고 LIVE 후 4주) ③ AdSense 통과 (수동 토글)
- **상태 저장**: R2 `ad-triggers/state.json`. 자동 체크는 weekly-report cron 직후 (매주 월 07:00 KST), 수동 체크는 카드의 "재확인" 버튼.
- **API**: `GET /api/analytics/ad-triggers` · `POST /ad-triggers/check` · `POST /ad-triggers/adsense { approved }`
- **파일**: `server/services/ad-trigger.service.ts`, `server/routes/analytics.routes.ts` 추가, `src/features/analytics/components/AdTriggerAlert.tsx`
- **다음 단계 옵션**: 카드 안에 leaderboard 추가 / 학습 종료 인터스티셜 / PC AdSense 활성화 3가지 노출

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
- **Google Analytics Data API v1** (GA4 대시보드, 서비스 계정 인증)
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
GA4_PROPERTY_ID=
GA4_SERVICE_ACCOUNT_KEY=./ga4-key.json  # 로컬: 파일 경로, Railway: 개별 변수 사용
GA4_CLIENT_EMAIL=                        # Railway용 (SERVICE_ACCOUNT_KEY 대체)
GA4_PRIVATE_KEY=                         # Railway용 (SERVICE_ACCOUNT_KEY 대체)
INSTAGRAM_USER_ID=                       # Instagram 비즈니스 계정 ID
INSTAGRAM_ACCESS_TOKEN=                  # Graph API 장기 토큰 (60일)
INSTAGRAM_GRAPH_VERSION=v21.0
SUPABASE_URL=https://uonznnypdnerdigfyfci.supabase.co  # 주간 리포트만 사용 (그 외는 R2 JSON)
SUPABASE_SERVICE_ROLE_KEY=               # RLS 우회용, 서버 사이드 전용
WEEKLY_REPORT_CRON=0 7 * * 1             # 선택 (기본: 매주 월 07:00)
WEEKLY_REPORT_TZ=Asia/Seoul              # 선택
WEEKLY_REPORT_ENABLED=true               # 선택, false면 cron 비활성
GSC_SITE_URL=sc-domain:gcnote.co.kr      # Search Console 사이트 URL (검색어 분석)
YOUTUBE_API_KEY=                         # 선택 — 채널 분석/경쟁사 YouTube 자동 수집용
```

## SEO
- 도메인: gcnote.co.kr
- sitemap.xml 자동 생성 (2,100+ URL)
- robots.txt (/admin, /api, /study/session 차단)
- 모든 페이지 "한능검" 키워드 포함 타이틀
- Google Search Console (gcnote-491301 프로젝트) + 네이버 서치어드바이저 등록
- JSON-LD: Quiz (문제), BreadcrumbList (문제+노트), Article + VideoObject (노트), **EducationalOrganization + WebSite (site-wide, brand entity signal)**
- OG 이미지 (4,100+ 정적 생성)

### SEO 전략 v1.4 (Living Doc, 2026-04-28)
- **위치**: `docs/seo-strategy.html` — GSC 실데이터 기반 SEO 전략, 매월 갱신
- **저작도구 사이드바 전략 문서 리스트** (StrategyDocsButton): 11개 마케팅 문서로 재구성 (단권화 23개 제거, SEO 전략을 최상단)
- **브랜드 SEO 코드 적용 완료**: layout.tsx default title "기출노트 — 한능검 기출문제와 요약노트 무료" + Schema.org `EducationalOrganization` + `WebSite` JSON-LD + Hero H1 "한능검 기출문제와 요약노트..." + Footer "기출노트는..." 정의문
- **황금키워드 26개 실측 검증**: 네이버 API로 58개 후보 → 26 황금 (병자호란 18,710 / 훈민정음 10,750 / 대동법 9,200 / 대한제국 5,650 / 5.18 4,540 / 노비안검법 3,990 / 세종대왕 업적 2,800 등). 거대 헤드텀 "한능검" 153,400 / "한국사능력검정시험" 139,500 — 정면 도전 비추, "한능검 + 수식어" 조합 진입 전략.
- **자동 갱신**: `cd author-tool && npm run seo:monthly` (또는 매월 1일 09:00 KST Railway cron) → `_research/seo-monthly/{YYYY-MM}/snapshot.json + digest.md`. GSC 30d/prev30d 비교 + 26 황금키워드 네이버 재검증 + MoM delta 자동. 수동 검토 후 § 01 KPI + § 10 update log 갱신 (15분).
- **스크립트** (`author-tool/scripts/`): `pull-gsc-deep.mjs` (90일 GSC), `validate-keywords-naver.mjs` (대량 후보 검증), `validate-keywords-naver-retry.mjs` (특수문자 키워드 재시도), `seo-monthly-update.mjs` (월간 통합)
- **데이터 폴더**: `_research/gsc-deep-{date}.json`, `_research/keyword-validation-{date}.json`, `_research/seo-monthly/{YYYY-MM}/`
- **GSC API 연동**: `author-tool/server/services/gsc.service.ts` — `gcnote-491301` 프로젝트의 서비스 계정 (`gcnote-ga4@symbolic-rope-491301-k9.iam.gserviceaccount.com`) 사용 (GA4 키 재활용). `sc-domain:gcnote.co.kr` 도메인 속성. 3일 지연 자동 처리.

## 스레드 운영 (수동, 2026-04-27 시작)
- 저작도구의 "1 노트 → N 채널" 모델이 스레드처럼 소스 무관 짧은 글에 안 맞아 **파일 기반 수동 운영** 채택.
- 위치: `data/threads-drafts/2026-04-27-batch-50.md` (57 게시물 + 운영 가이드) + `threads-batch-57.csv` (Excel 호환)
- 스크립트: `scripts/export-threads-csv.mjs` (md → csv 변환)
- 카테고리 비율: 빌더 일지 26% / 한국사 한 입 35% / 수험생 공감 18% / 데이터·발견 9% / 공무원 확장 12%
- Meta API 자동발행은 보류 — 수동 복붙 운영

## 자동 단권화 노트 시스템 (23개 본문 + 656 자동 가이드, 2026-04-27)

전체 730 stem 중 **656 stem 자동 가이드** + **23개 본문 노트**. 사이드바·SSG 페이지·문제↔단원 매칭·저작도구 편집 모두 통합.

### 본문 직접 작성 (23개)
- **9급 국가직 13개**: 행정법·행정학·형법·형사소송법·회계학·세법·교정학·사회복지·교육학·국제법·관세법·국어·영어
- **7급/PSAT 1개**: 헌법 (PSAT_헌법.json 8회 200문제 → 15단원)
- **자격증 9개**: 정보처리기사·산업안전기사·공인중개사1차·공인중개사2차·컴퓨터활용능력1급·전산회계1급·전기기사·사회조사분석사2급·직업상담사2급

### 자동 가이드 (656 stem, 본문 X)
- 단원 자동 분류 + 단원별 키워드 + 문제↔단원 매칭 (질문 패턴 휴리스틱)
- 본문 없는 stem도 시험 페이지에 "📚 자동 학습 가이드" 섹션 노출
- 트래픽 보고 인기 시험은 본문 추가 (점진 확장)

### 데이터·코드
- 본문 노트: `docs/{slug}-summary-note.html`
- 본문 추출: `web/data/civil-notes/{slug}/` (sync-civil-notes.mjs + sync-civil-topics.mjs)
- 자동 가이드: `web/data/civil-notes-auto/{stem}/` (build-auto-civil-guides.mjs, 457MB)
- 매칭 인덱스: `web/data/civil-notes/question-topic-map.json` + `topic-questions-map.json`
- 매핑: `web/lib/civil-notes.ts` SUBJECT_TO_NOTE + `web/lib/civil-notes-client.ts` (client-safe)
- 자동 가이드 lib: `web/lib/civil-notes-auto.ts`
- SSG 페이지: `web/app/civil-notes/[slug]/[topicId]/page.tsx` (274 단원 long-tail SEO)
- 저작도구 편집: `author-tool/server/routes/civil-notes.routes.ts` + `src/features/civil-notes/CivilNotesPanel.tsx`
- prebuild·build에 자동 sync 포함

### Phase 진행 상태
- ✅ Phase A: 자동 인프라 (656 stem · 7,893 토픽 · 989,357 문제 매칭)
- ✅ Phase B: 7급 헌법 (나머지는 자동 가이드 사용)
- ✅ Phase C: 인기 자격증 Top 9
- 🚧 Phase D~E: Tier 2~3 자격증 (트래픽 보고 우선순위 결정)

## 9급 국가직 자동 단권화 노트 (13개, 2026-04-27)

저작도구 사이드바 "📋 전략 문서"에서 접근. 9급 국가직 13개 과목 (한능검 제외, 헌법은 9급 미출제) 자동 단권화 HTML 노트.

- **위치**: `docs/{slug}-summary-note.html` — 모든 과목 동일 디자인 시스템 (cream/amber/teal + Noto Serif KR)
- **데이터 소스**: `cbt_data/json/9급_국가직_공무원_{과목}.json` (R2 동기화)
- **작업 데이터**: `_admin-notes-work/9급-국가직-{과목}/` (seed.json + test.json + topics.json)
- **검증 도구**: `_coverage-check/verify-v2.mjs` — 전 회차 200~440문제로 빈출 주제 추출 → 노트 매칭률 측정 (현재 13/13 모두 100%)
- **사이드바 등록**: `author-tool/src/components/sidebar/StrategyDocsButton.tsx` STRATEGY_DOCS 배열
- **운영 방침**: 트래픽 데이터(GA4) 보고 인기 과목부터 우선 업데이트. 누락 키워드는 verify-v2.mjs로 주기적 재검증

| 과목 | 파일 | 단원 |
|---|---|---|
| 행정법총론 | admin-law-summary-note.html | 28 |
| 행정학개론 | admin-pa-summary-note.html | 13 |
| 형법총론 | criminal-law-summary-note.html | 14 |
| 형사소송법개론 | criminal-procedure-summary-note.html | 15 |
| 회계학 | accounting-summary-note.html | 12 |
| 세법개론 | tax-law-summary-note.html | 10 |
| 교정학개론 | corrections-summary-note.html | 11 |
| 사회복지학개론 | social-welfare-summary-note.html | 13 |
| 교육학개론 | education-summary-note.html | 13 |
| 국제법개론 | international-law-summary-note.html | 14 |
| 관세법개론 | customs-law-summary-note.html | 10 |
| 국어 (공통) | korean-summary-note.html | 9 |
| 영어 (공통) | english-summary-note.html | 9 |

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
- 컨텐츠 데이터는 **R2에 저장** (`contents/index.json` + `contents/ct-{id}.json`), 이미지도 R2 `contents/{id}/` 경로 — 로컬/Railway 양쪽이 같은 버킷 공유
- 컨텐츠 SSE 생성: `POST /api/contents/:id/generate/:channel` → `data: {"type":"chunk|complete|error",...}`
- 컨텐츠 서비스의 서버 타입(content.service.ts)은 `any[]` — 프론트 타입(content-types.ts)이 정확한 타입 정의
- 주간 리포트는 **Supabase service_role 키 필요** (RLS 우회). 최초 1회 `supabase/migrations/weekly_reports.sql` 실행 필요. 백필은 `npx tsx scripts/weekly-report-backfill.ts`
- 마케팅 슈트(발행/모니터링/광고/경쟁사 등)는 **모두 R2 JSON 저장** — 단일 프로세스 동시성만 보장 (Railway 1인스턴스 + 1작성자 가정). 다중 인스턴스 운영 시 ETag 기반 낙관적 락 추가 필요
- 프로젝트 설정 자동 저장은 600ms debounce + flush on tab change/unmount. 패치는 `PATCH /api/projects/:id` 화이트리스트 필드만 반영
- AI 콘텐츠/아이디어/답글/주제 생성 모두 프로젝트의 brand+writingGuide+referenceSummary를 컨텍스트로 사용 → 설정이 비면 결과 품질 저하

## 언어
- 사용자 인터페이스: 한국어
- 코드/커밋: 영어
