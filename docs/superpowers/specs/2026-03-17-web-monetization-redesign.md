# Web Monetization Redesign Spec

> Next.js SSG website with AdSense monetization, Naver SEO focus, no auth required.

## Context

Existing Expo app has a working Korean history exam study platform with 3,279 questions across 66 exams and a comprehensive summary notes HTML file (1.5MB). The goal is to create a separate Next.js website optimized for search engine traffic (primarily Naver) and monetize through Google AdSense.

## Key Decisions

- **No login/signup** — all user data stored in localStorage
- **Ads only after content consumption** — never during problem-solving
- **Naver SEO priority** — SSG for bot crawlability, Naver SearchAdvisor integration
- **Reuse existing content** — split notes.html into 40-50 individual pages, use existing exam JSON data
- **Top navigation** — web-standard header nav, not bottom tab bar

## Navigation Structure

```
┌──────────────────────────────────────────────┐
│ 📝 한국사기출  [기출문제] [요약노트] [오답노트]  │
├──────────────────────────────────────────────┤
│                 (content)                     │
├──────────────────────────────────────────────┤
│ © 한국사기출 | 이용약관 | 개인정보처리방침       │
└──────────────────────────────────────────────┘
```

Three main sections accessible from top GNB:
- **기출문제**: Exam list → exam detail → individual question
- **요약노트**: Era-based list → individual note page
- **오답노트**: Wrong answer list with resolved/unresolved filter

## URL Structure

```
/                              # Landing page
/exam                          # All exams list (66)
/exam/[examNumber]             # Exam detail (50 questions)
/exam/[examNumber]/[qNumber]   # Individual question page
/notes                         # Notes list by era
/notes/[noteId]                # Individual note page
/wrong-answers                 # Wrong answers (client-side only, no SSG)
/privacy                       # Privacy policy
/terms                         # Terms of service
```

## Ad Placement Strategy

| Page | Ads | Placement |
|------|-----|-----------|
| Exam list/detail | None | - |
| Question (solving) | None | - |
| Question (after reveal) | 1 | Below explanation |
| Summary note | 2 | Mid-content + bottom |
| Wrong answer list | None | - |
| Landing page | None | - |

### Principle
Ads appear only where users are **consuming content** (reading explanations, studying notes), never where they are **actively thinking** (solving problems, browsing lists).

## Data Models

### Wrong Answer (localStorage)

```typescript
interface WrongAnswer {
  questionId: number;
  examId: number;
  selectedAnswer: number;    // User's wrong choice
  correctAnswer: number;
  createdAt: string;         // ISO date
  resolved: boolean;         // Re-solved correctly
  resolvedAt?: string;       // ISO date
}
// localStorage key: "wrong-answers"
```

### Summary Note (split from notes.html)

```typescript
interface SummaryNote {
  id: string;                    // slug: "goryeo-political-system"
  title: string;                 // "고려 건국과 통치 체제"
  era: Era;
  content: string;               // HTML content (split from notes.html)
  relatedKeywords: string[];
  relatedQuestionIds: number[];
  order: number;
}
```

### Auto-resolve Logic

When a user re-attempts a wrong answer question and selects the correct answer:
1. Find the WrongAnswer entry by questionId
2. Set `resolved: true` and `resolvedAt: new Date().toISOString()`
3. Move to "resolved" section in the wrong answers list

## Page Designs

### Individual Question Page (`/exam/[examNumber]/[qNumber]`)

```
┌──────────────────────────────────┐
│ 🏠 > 제45회 > 23번               │  ← Breadcrumb
│                                  │
│ 제45회 한국사능력검정시험 23번 (3점) │
│ 시대: 근대 | 분야: 정치            │
│                                  │
│ [문제 이미지]                     │
│ (문제 본문)                       │
│                                  │
│ ① 선지 1                         │
│ ② 선지 2                         │
│ ③ 선지 3                         │
│ ④ 선지 4                         │
│ ⑤ 선지 5                         │
│                                  │
│ [정답 확인하기]                    │
│                                  │
│ ── After reveal ──               │
│ ✅ 정답: ③                        │
│ 해설: (explanation text)          │
│                                  │
│ ┌── AdSense (1) ──────────────┐  │
│ └──────────────────────────────┘  │
│                                  │
│ 📚 관련 요약노트                  │
│ → 근대 - 동학농민운동              │
│                                  │
│ 🔗 같은 키워드 기출                │
│ · 제52회 18번 · 제61회 31번       │
│                                  │
│ ← 22번    [목록]    24번 →       │
└──────────────────────────────────┘
```

### Summary Note Page (`/notes/[noteId]`)

```
┌──────────────────────────────────┐
│ 🏠 > 요약노트 > 근대 > 동학농민운동│
│                                  │
│ 동학 농민 운동                    │
│ 시대: 근대 | 관련 기출: 15문제     │
│                                  │
│ (note content - first half)      │
│                                  │
│ ┌── AdSense (1) ──────────────┐  │
│ └──────────────────────────────┘  │
│                                  │
│ (note content - second half)     │
│                                  │
│ 📝 관련 기출문제 (15문제)          │
│ · 제45회 23번 [풀어보기]          │
│ · 제52회 18번 [풀어보기]          │
│                                  │
│ ┌── AdSense (2) ──────────────┐  │
│ └──────────────────────────────┘  │
│                                  │
│ ← 이전 노트  |  다음 노트 →      │
└──────────────────────────────────┘
```

### Wrong Answers Page (`/wrong-answers`)

```
┌──────────────────────────────────┐
│ 오답노트                          │
│                                  │
│ [미해결 12개] [해결됨 5개]         │  ← Filter tabs
│                                  │
│ ┌──────────────────────────────┐ │
│ │ 제45회 23번 - 동학농민운동     │ │
│ │ 내 답: ② | 정답: ③ | 3점     │ │
│ │ 2026-03-15                   │ │
│ │            [다시 풀기]        │ │
│ └──────────────────────────────┘ │
│ ┌──────────────────────────────┐ │
│ │ 제52회 18번 - 갑오개혁        │ │
│ │ 내 답: ④ | 정답: ① | 2점     │ │
│ │ 2026-03-14                   │ │
│ │            [다시 풀기]        │ │
│ └──────────────────────────────┘ │
│ ...                              │
│                                  │
│ 광고 없음                         │
└──────────────────────────────────┘
```

## PV Circulation Flow

```
[Flow A: Exam search entry]
Naver "한국사 45회 23번"
  → /exam/45/23 (solve)                    PV 1
  → Reveal answer + explanation (ad 1)
  → Click "관련 노트: 동학농민운동"         PV 2 (ad 2)
  → Click "관련 기출 제52회 18번"           PV 3
  → Reveal → explanation (ad 1) → ...repeat

[Flow B: Study keyword entry]
Naver "동학농민운동 한국사 정리"
  → /notes/donghak-movement (ad 2)         PV 1
  → Click "관련 기출 제45회 23번"           PV 2
  → Solve → reveal (ad 1)
  → Click "관련 노트" → ...repeat          PV 3

[Flow C: Wrong answer review]
Return visit → /wrong-answers              PV 1
  → "다시 풀기" click                       PV 2
  → Correct → auto-resolve + explanation (ad 1)
  → "이 개념 복습" → note page (ad 2)      PV 3
  → ...repeat
```

## SEO Strategy (Naver Focus)

- **SSG mandatory**: Naver bot does not execute JavaScript
- **Naver SearchAdvisor**: Register site + submit sitemap
- **Meta tags**: Korean-optimized title/description per page
- **Structured data**: JSON-LD for Quiz/Question schema
- **Sitemap**: Auto-generated, 3,400+ URLs
- **Internal linking**: All pages reachable within 3 clicks
- **Google Search Console**: Also register for Google traffic

## Tech Stack

```
Framework:     Next.js 14+ (App Router, SSG)
Styling:       Tailwind CSS
Deployment:    Vercel (free tier)
Domain:        .kr domain (~20,000 KRW/year)
Ads:           Google AdSense
Images:        Cloudflare R2 (existing infrastructure)
Analytics:     Google Analytics 4 + Naver Analytics
Storage:       localStorage (wrong answers, no auth)
```

## Content Pipeline

### Notes Split
1. Parse existing `public/notes.html` (7 era sections)
2. Split into 40-50 individual topic pages
3. Extract HTML content per topic
4. Map keywords to question IDs for related questions
5. Store as JSON in `data/notes/`

### Exam Data
- Reuse existing `data/questions/exam-{N}.json` directly
- Import at build time via `fs.readFileSync` in `getStaticProps`

## Cost Structure

| Item | Cost | Notes |
|------|------|-------|
| Vercel hosting | Free | Free tier (100GB bandwidth/mo) |
| .kr domain | ~20,000 KRW/yr | |
| Cloudflare R2 | Free | Existing, 10GB + 10M requests free |
| **Total monthly** | **0 KRW** | Until traffic exceeds free tier |

## Revenue Estimate (Conservative)

```
After 3 months (stabilized):
- Daily visitors: 500-1,000
- Avg PV per session: 5-8
- Daily PV: 3,000-8,000
- Monthly PV: 90,000-240,000
- Education CPC: 200-400 KRW
- CTR: 1-2%
- Monthly revenue: 180,000-960,000 KRW

Exam season (6x/year, 2 weeks each):
- Traffic 3-5x surge
- Season revenue: 540,000-4,800,000 KRW
```
