# Multi-Exam Strip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 메인 페이지 한능검 Hero 직후에 9급 공무원·자격증 cross-sell 띠 1줄을 추가한다. 한능검 SEO 자산은 일체 건드리지 않는다.

**Architecture:** 단일 책임 컴포넌트 `MultiExamStrip.tsx` 신규 추가 → `KoreanHistoryLanding.tsx`의 `<Hero />`와 `<StatsBand />` 사이에 한 줄 삽입. 8번 칩의 페이지 내 앵커 점프 대상으로 `OtherExamsSection.tsx`에 `id="other-exams"` 추가.

**Tech Stack:** Next.js 16 App Router + React 19 + Tailwind v4. 테스트 인프라 없음(웹 프로젝트) → 검증은 `npm run build` 통과 + dev server 시각 확인 + View Source로 SEO 자산 무손상 확인.

**Reference:** [2026-05-22-multi-exam-strip-design.md](../specs/2026-05-22-multi-exam-strip-design.md)

---

## 파일 매핑

| 액션 | 파일 | 책임 |
|---|---|---|
| Create | `web/components/MultiExamStrip.tsx` | 카피 1줄 + 칩 8개 + 상하 hairline + 색상 토큰 — 정적 컴포넌트 (~90줄 예상) |
| Modify | `web/components/KoreanHistoryLanding.tsx:1925-1926` | `<Hero />` 다음에 `<MultiExamStrip />` 한 줄 삽입 + import 한 줄 추가 |
| Modify | `web/components/OtherExamsSection.tsx` | 최상단 wrapper `<section>`에 `id="other-exams"` 추가 |

**수정 안 함**: `web/app/layout.tsx`, `web/app/page.tsx`, KoreanHistoryLanding 본문(Hero·Stats·FeatureGrid·ExamPreview·NotesPreview·LinkedPreview·LatestExamsBand·PricingBand·SeoProse).

---

### Task 1: MultiExamStrip 컴포넌트 신규 작성

**Files:**
- Create: `web/components/MultiExamStrip.tsx`

- [ ] **Step 1: 컴포넌트 파일 작성**

전체 코드를 그대로 새 파일에 작성한다.

```tsx
// web/components/MultiExamStrip.tsx
// 메인 페이지 한능검 Hero 직후 다중 시험 cross-sell 띠.
// 디자인 결정: docs/superpowers/specs/2026-05-22-multi-exam-strip-design.md

import Link from "next/link";

const CHIPS: { label: string; href: string }[] = [
  { label: "9급 일반행정", href: "/9급-국가직-일반행정" },
  { label: "9급 세무", href: "/9급-국가직-세무" },
  { label: "9급 교정", href: "/9급-국가직-교정" },
  { label: "9급 검찰사무", href: "/9급-국가직-검찰사무" },
  { label: "9급 사회복지", href: "/9급-국가직-사회복지" },
  { label: "공인중개사", href: "/공인중개사" },
  { label: "정보처리기사", href: "/정보처리기사" },
];

// 한능검 디자인 시스템 토큰 (KoreanHistoryLanding과 동일)
const T = {
  bg: "#F5EFE4",
  ink: "#1F1A14",
  amber: "#C77B3D",
  paper: "#FFFBF3",
};

export default function MultiExamStrip() {
  return (
    <section
      role="complementary"
      aria-label="다른 시험 진입"
      style={{
        background: T.bg,
        color: T.ink,
        borderTop: `1px solid ${T.ink}`,
        borderBottom: `1px solid ${T.ink}`,
      }}
      className="px-5 sm:px-6 md:px-8 py-6 md:py-8"
    >
      <div className="max-w-6xl mx-auto">
        <p
          className="font-sans-kr text-base md:text-lg"
          style={{ color: T.ink, fontWeight: 500 }}
        >
          공무원 시험도 같은 학습 시스템으로 — 9급 13과목 단원별 정리 완비
        </p>
        <p
          className="font-mono-kr text-xs mt-1 opacity-70"
          style={{ color: T.ink }}
        >
          9급 13과목 + 인기 자격증 단원별 정리 노트 완비
        </p>

        <div
          className="mt-4 flex gap-2 overflow-x-auto md:flex-wrap"
          style={{ scrollbarWidth: "none" }}
        >
          {CHIPS.map((chip) => (
            <Link
              key={chip.href}
              href={chip.href}
              className="shrink-0 rounded-full px-4 py-2 text-sm font-sans-kr transition-colors"
              style={{
                border: `1px solid ${T.amber}`,
                color: T.amber,
                background: "transparent",
              }}
            >
              {chip.label}
            </Link>
          ))}
          <Link
            href="#other-exams"
            className="shrink-0 rounded-full px-4 py-2 text-sm font-sans-kr"
            style={{
              background: T.ink,
              color: T.paper,
              border: `1px solid ${T.ink}`,
            }}
          >
            전체 547과목 →
          </Link>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: TypeScript 컴파일 통과 확인**

Run:
```
cd web && npx tsc --noEmit
```
Expected: 에러 없음 (또는 기존 에러만 — 새로 발생한 에러 0건)

만약 `font-sans-kr` / `font-mono-kr` 관련 lint 에러가 나오면, `web/app/globals.css`에 해당 클래스가 정의돼 있으므로 무시. PostCSS 처리 단계에서 적용된다.

- [ ] **Step 3: 커밋**

```
git add web/components/MultiExamStrip.tsx
git commit -m "feat(landing): MultiExamStrip 컴포넌트 신규 — 9급 cross-sell 칩 8개"
```

---

### Task 2: KoreanHistoryLanding에 strip 삽입

**Files:**
- Modify: `web/components/KoreanHistoryLanding.tsx`

- [ ] **Step 1: import 추가**

파일 상단의 다른 컴포넌트 import 근처에 한 줄 추가. 정확한 위치는 기존 import 그룹 끝.

기존 import 그룹 끝에 다음 한 줄 추가:
```tsx
import MultiExamStrip from "@/components/MultiExamStrip";
```

- [ ] **Step 2: JSX에 한 줄 삽입**

파일 line 1925 근처의 다음 부분을 찾는다:

```tsx
      <Hero />
      <StatsBand
        totalQuestions={totalQuestions}
        examCount={examCount}
        noteCount={noteCount}
      />
```

`<Hero />`와 `<StatsBand ... />` 사이에 `<MultiExamStrip />`를 끼워넣는다:

```tsx
      <Hero />
      <MultiExamStrip />
      <StatsBand
        totalQuestions={totalQuestions}
        examCount={examCount}
        noteCount={noteCount}
      />
```

- [ ] **Step 3: 커밋**

```
git add web/components/KoreanHistoryLanding.tsx
git commit -m "feat(landing): Hero 직후 MultiExamStrip 삽입 — 9급 cross-sell 동선"
```

---

### Task 3: OtherExamsSection에 anchor id 추가

**Files:**
- Modify: `web/components/OtherExamsSection.tsx`

- [ ] **Step 1: 현재 최상단 wrapper 확인**

파일을 열어 컴포넌트가 return하는 최상단 element를 확인한다 (line 30 근처). 그 element에 `id="other-exams"` 추가.

예시 (실제 코드는 다를 수 있음 — 최상단 wrapper element 1곳에만 추가):

기존:
```tsx
  return (
    <section className="...">
      {/* ... */}
    </section>
  );
```

수정 후:
```tsx
  return (
    <section id="other-exams" className="...">
      {/* ... */}
    </section>
  );
```

만약 최상단이 `<div>`나 다른 element라면 그 element에 추가.

- [ ] **Step 2: 커밋**

```
git add web/components/OtherExamsSection.tsx
git commit -m "feat(landing): OtherExamsSection에 anchor id 추가 — MultiExamStrip 점프 대상"
```

---

### Task 4: 빌드 검증

- [ ] **Step 1: 프로덕션 빌드 실행**

Run:
```
cd web && npm run build
```

Expected:
- ✓ Compiled successfully
- 정적 페이지 생성 정상 진행
- 빌드 종료 시 에러 0건
- 한능검 페이지(/)가 정적으로 생성되는지 확인 (출력 표에 `/` 또는 `(ssg) /` 표기)

빌드 실패 시:
- TypeScript 에러 → Task 1·2의 import 경로 확인
- Tailwind class 미인식 → globals.css의 font 유틸 정의 확인 (이미 존재해야 정상)
- Hydration mismatch는 이 컴포넌트가 정적이므로 발생 가능성 거의 0

- [ ] **Step 2: 빌드 통과 확인 후 다음 단계로**

빌드 통과 시 별도 커밋 없이 다음 task로.

---

### Task 5: dev server 시각 검증

- [ ] **Step 1: dev server 실행**

Run:
```
cd web && npm run dev
```

- [ ] **Step 2: 데스크탑(1280) 시각 확인**

브라우저에서 `http://localhost:3000` 접속.

확인 항목:
- Hero 다 보고 스크롤하면 **다음에 cream 배경 띠**가 나타난다
- 띠 상단·하단에 가는 검정 선(ink hairline) 1px씩
- 카피 "공무원 시험도 같은 학습 시스템으로 — 9급 13과목 단원별 정리 완비"가 본문체로
- 그 아래 mono 폰트 부제 "9급 13과목 + 인기 자격증 단원별 정리 노트 완비"
- 칩 8개가 가로 한 줄 또는 flex-wrap으로 표시 (앞 7개는 amber outline, 마지막 "전체 547과목 →"은 deep ink 솔리드)
- 띠 다음에 StatsBand(한능검 통계)가 정상 표시

- [ ] **Step 3: 모바일(375) 시각 확인**

DevTools에서 viewport를 iPhone SE(375x667) 또는 비슷한 모바일 사이즈로 전환.

확인 항목:
- 카피·부제는 여전히 잘 읽힘 (text-base 유지)
- 칩 row가 가로 스크롤 1줄로 표시 (8개 펼침, 왼쪽으로 스와이프하면 나머지 칩 보임)
- 띠가 화면을 너무 많이 차지하지 않음 (대략 화면 높이의 20~30%)

- [ ] **Step 4: 칩 클릭 동선 확인**

칩 8개 중 임의로 3개 클릭해 페이지 이동 정상인지 확인:
- "9급 일반행정" 클릭 → `/9급-국가직-일반행정` 페이지 정상 렌더링
- "공인중개사" 클릭 → `/공인중개사` 페이지 정상 렌더링
- "전체 547과목 →" 클릭 → 같은 페이지 내 OtherExamsSection으로 스크롤 점프 (브라우저 주소창에 `#other-exams` 추가)

만약 칩 클릭 시 404 → Task 1의 CHIPS 배열 href 다시 확인 (slug 정확성).
만약 "전체 547과목 →"이 점프 안 함 → Task 3의 `id="other-exams"`가 정확히 추가됐는지 확인.

---

### Task 6: SEO 자산 무손상 검증

- [ ] **Step 1: View Source로 한능검 메타 확인**

브라우저에서 `http://localhost:3000` 접속 → 우클릭 → "페이지 소스 보기".

확인 항목 (이전과 동일해야 함):
- `<title>` 태그에 `기출노트 — 한능검 기출문제와 요약노트 무료`
- `<meta name="description">`에 한능검 정의문이 그대로
- `<meta name="keywords">`에 23개 한능검·공무원 키워드 그대로 (v1.10에서 추가된 공무원 시그널 11개 포함)
- `<script type="application/ld+json">`에 `EducationalOrganization` 또는 `WebSite` 스키마 그대로

- [ ] **Step 2: H1이 한능검 Hero인지 확인**

페이지 소스에서 `<h1` 검색. 첫 번째 `<h1>` 내용이 한능검 Hero 정의문이어야 한다 (Hero 컴포넌트 내부에 정의된 그대로).

MultiExamStrip은 `<section>` + `<p>` 만 사용하고 h1·h2 미사용 → heading hierarchy 무손상.

- [ ] **Step 3: JSON-LD 개수 확인**

페이지 소스에서 `application/ld+json` 검색 → script 태그 개수가 strip 추가 전과 동일한지 확인.

MultiExamStrip은 JSON-LD 미주입 → 개수 변화 없어야 함.

검증 실패 시:
- title/description/keywords 변경 → layout.tsx를 실수로 건드렸는지 확인 (안 건드렸어야 함)
- H1이 strip 카피로 바뀜 → Task 1의 MultiExamStrip 코드에서 `<p>` 대신 `<h1>`이 들어갔는지 확인하고 `<p>`로 수정

---

### Task 7: 최종 정리 + push

- [ ] **Step 1: git status 확인**

Run: `git status`

Expected: 더 이상 unstaged 변경 없음 (모두 Task 1~3에서 커밋됨).

- [ ] **Step 2: 직전 3개 커밋 확인**

Run: `git log -3 --oneline`

Expected 비슷한 형태:
```
xxxxx feat(landing): OtherExamsSection에 anchor id 추가 — MultiExamStrip 점프 대상
xxxxx feat(landing): Hero 직후 MultiExamStrip 삽입 — 9급 cross-sell 동선
xxxxx feat(landing): MultiExamStrip 컴포넌트 신규 — 9급 cross-sell 칩 8개
```

- [ ] **Step 3: main에 push (자동 배포)**

Run: `git push origin main`

Expected: Vercel 자동 배포 트리거 → 2~3분 후 https://gcnote.co.kr 메인 페이지에서 strip 보임.

- [ ] **Step 4: 프로덕션 시각 재확인**

배포 완료 후 https://gcnote.co.kr 접속:
- Hero 아래 strip 정상 표시
- 칩 7개 클릭 시 직렬/자격증 페이지 정상 이동
- "전체 547과목 →" 클릭 시 동일 페이지 OtherExamsSection으로 점프

문제 발생 시 `git revert HEAD~2..HEAD` 후 재배포로 롤백 가능 (작업 3개 커밋 한꺼번에).

---

## 비고

- **테스트 코드 작성 안 함**: web/ 프로젝트에 테스트 인프라(jest/vitest/playwright) 없음. 모두 빌드 + 시각 확인 + View Source 검증으로 갈음.
- **GA4 이벤트 트래킹**: 칩 클릭에 `gtag('event','multi_exam_chip_click',...)` 추가는 spec의 "후속 작업"으로 분리. 이번 plan에 미포함.
- **시험 결과 페이지 cross-sell**: spec의 "후속 작업" 1순위. 이번 plan에 미포함.
- **롤백 안전성**: 모든 변경이 3개 커밋으로 분리 → 문제 시 `git revert` 단위로 정확한 부분만 되돌릴 수 있음.
