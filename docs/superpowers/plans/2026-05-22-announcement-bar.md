# Announcement Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모든 페이지 헤더 직후에 자동 롤링 텍스트 공지 띠를 추가한다. 게시판이 잘 안 읽히는 문제 해결 + 78회 시험 끝난 사용자에게 즉시 메시지 도달.

**Architecture:** 데이터(상수) + UI(클라이언트 컴포넌트) 분리. `web/lib/announcements.ts` 메시지 배열, `web/components/AnnouncementBar.tsx` 자동 회전 컴포넌트. layout.tsx에 mount 1줄 추가.

**Tech Stack:** Next.js 16 App Router + React 19 (useState/useEffect) + Tailwind v4. 테스트 인프라 없음 → 빌드 + dev server 시각 확인 + localStorage 동작 + View Source SEO 검증.

**Reference:** [2026-05-22-announcement-bar-design.md](../specs/2026-05-22-announcement-bar-design.md)

---

## 파일 매핑

| 액션 | 파일 | 책임 |
|---|---|---|
| Create | `web/lib/announcements.ts` | `Announcement` 타입 + `ANNOUNCEMENTS` 상수 배열 + `getActiveAnnouncements()` 헬퍼 (expiresAt 필터링) |
| Create | `web/components/AnnouncementBar.tsx` | 5초 자동 회전 + hover 일시정지 + ✕ 24시간 dismiss + 도트 인디케이터 |
| Modify | `web/app/layout.tsx` line 175 직후 | `<AnnouncementBar />` 한 줄 추가 + import 한 줄 |

**수정 안 함**: layout.tsx의 metadata·JSON-LD·viewport·any meta, Header.tsx 본문.

---

### Task 1: announcements 데이터 모듈 작성

**Files:**
- Create: `web/lib/announcements.ts`

- [ ] **Step 1: 파일 작성 (전체)**

```ts
// web/lib/announcements.ts
// AnnouncementBar에 노출할 시의성 공지 메시지.
// 갱신 빈도가 월 1~2회라 코드 상수 + 배포로 충분 (R2/Supabase 인프라 불필요).
// 만료된 메시지는 자동으로 회전에서 제외.

export type Announcement = {
  id: string;
  text: string;
  href: string;
  emoji?: string;
  /** ISO date (YYYY-MM-DD). 이 날짜 0시 이후 자동 숨김. 생략 시 만료 없음. */
  expiresAt?: string;
};

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "exam-78-congrats",
    emoji: "🎉",
    text: "한능검 78회 보느라 수고하셨어요 — 정답·해설 확인하기",
    href: "/exam/78/1",
    expiresAt: "2026-06-15",
  },
  {
    id: "exam-78-released",
    emoji: "🆕",
    text: "78회 기출 + AI 해설 업로드 완료",
    href: "/exam",
    expiresAt: "2026-06-30",
  },
  {
    id: "civil-9-expansion",
    emoji: "📚",
    text: "9급 공무원도 같은 학습 시스템 — 13과목 단원별 정리",
    href: "/9급-국가직-일반행정",
    // 만료 없음 (상시 cross-sell)
  },
];

/**
 * 현재 시점에 유효한 announcement만 반환.
 * - expiresAt이 없으면 무조건 노출
 * - expiresAt이 있으면 그 날짜 0시 이전까지만 노출
 */
export function getActiveAnnouncements(now: Date = new Date()): Announcement[] {
  return ANNOUNCEMENTS.filter((a) => {
    if (!a.expiresAt) return true;
    const exp = new Date(`${a.expiresAt}T00:00:00+09:00`); // KST 자정 기준
    return now < exp;
  });
}
```

- [ ] **Step 2: TypeScript 컴파일 확인**

Run: `cd web && npx tsc --noEmit`
Expected: 새 에러 0건.

- [ ] **Step 3: 커밋**

```
git add web/lib/announcements.ts
git commit -m "feat(announcements): 공지 메시지 데이터 모듈 신규 — 78회 격려/업데이트/9급 확장 3종 시드"
```

---

### Task 2: AnnouncementBar 컴포넌트 작성

**Files:**
- Create: `web/components/AnnouncementBar.tsx`

- [ ] **Step 1: 컴포넌트 파일 작성 (전체)**

```tsx
// web/components/AnnouncementBar.tsx
// 헤더 직후 자동 롤링 공지 띠.
// - 5초 간격 회전, hover/focus 시 일시정지
// - ✕ 클릭 시 24시간 dismiss (localStorage)
// - expiresAt 지난 메시지 자동 제외 (lib/announcements.ts)
// - SEO: H1/H2 미사용, aria-live="polite", JSON-LD 미주입

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getActiveAnnouncements } from "@/lib/announcements";

const T = {
  bg: "#1F1A14",      // deep ink
  fg: "#F5EFE4",      // cream
  amber: "#C77B3D",
};
const ROTATE_MS = 5000;
const DISMISS_HOURS = 24;
const DISMISS_KEY = "announcement_dismissed_until";

export default function AnnouncementBar() {
  const items = useMemo(() => getActiveAnnouncements(), []);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // dismiss state 초기화 (localStorage 확인)
  useEffect(() => {
    try {
      const until = localStorage.getItem(DISMISS_KEY);
      if (until && Date.now() < Number(until)) {
        setDismissed(true);
      }
    } catch {}
  }, []);

  // 자동 회전
  useEffect(() => {
    if (items.length <= 1 || paused || dismissed) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, [items.length, paused, dismissed]);

  if (dismissed || items.length === 0) return null;

  const current = items[index];

  const dismiss = () => {
    try {
      const until = Date.now() + DISMISS_HOURS * 60 * 60 * 1000;
      localStorage.setItem(DISMISS_KEY, String(until));
    } catch {}
    setDismissed(true);
  };

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-label="사이트 공지"
      style={{ background: T.bg, color: T.fg }}
      className="w-full"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="mx-auto max-w-6xl flex items-center gap-2 px-4 h-9 md:h-10 text-xs md:text-sm">
        <Link
          href={current.href}
          className="flex-1 min-w-0 flex items-center gap-2 truncate hover:underline"
          style={{ color: T.fg }}
          onMouseEnter={(e) => (e.currentTarget.style.color = T.amber)}
          onMouseLeave={(e) => (e.currentTarget.style.color = T.fg)}
        >
          {current.emoji && <span aria-hidden>{current.emoji}</span>}
          <span className="truncate">{current.text}</span>
        </Link>

        {/* 도트 인디케이터 (메시지 2개 이상일 때만) */}
        {items.length > 1 && (
          <div className="hidden md:flex items-center gap-1 shrink-0">
            {items.map((_, i) => (
              <button
                key={i}
                aria-label={`공지 ${i + 1}로 이동`}
                onClick={() => setIndex(i)}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: i === index ? 14 : 6,
                  background: i === index ? T.amber : T.fg,
                  opacity: i === index ? 1 : 0.3,
                }}
              />
            ))}
          </div>
        )}

        <button
          aria-label="공지 닫기 (24시간)"
          onClick={dismiss}
          className="shrink-0 px-2 py-1 leading-none"
          style={{ color: T.fg, opacity: 0.5 }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.5")}
        >
          ✕
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: TypeScript 컴파일 확인**

Run: `cd web && npx tsc --noEmit`
Expected: 새 에러 0건.

- [ ] **Step 3: 커밋**

```
git add web/components/AnnouncementBar.tsx
git commit -m "feat(announcements): AnnouncementBar 컴포넌트 신규 — 자동 회전 + 24시간 dismiss + a11y"
```

---

### Task 3: layout.tsx에 mount

**Files:**
- Modify: `web/app/layout.tsx`

- [ ] **Step 1: import 추가**

파일 상단에서 다른 컴포넌트 import 근처(`import Header from "@/components/Header";` 라인 근처)에 한 줄 추가:

```tsx
import AnnouncementBar from "@/components/AnnouncementBar";
```

- [ ] **Step 2: Header 직후에 mount**

파일 line 175 근처의 다음 부분을 찾는다:

```tsx
        <div className="flex min-h-screen flex-col">
          <Header examTypes={getAllExamTypes()} subjects={getAllSubjects()} />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5">
```

`<Header>`와 `<main>` 사이에 `<AnnouncementBar />`를 끼워넣는다:

```tsx
        <div className="flex min-h-screen flex-col">
          <Header examTypes={getAllExamTypes()} subjects={getAllSubjects()} />
          <AnnouncementBar />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5">
```

- [ ] **Step 3: 커밋**

```
git add web/app/layout.tsx
git commit -m "feat(announcements): layout.tsx에 AnnouncementBar mount — Header 직후 전 페이지 노출"
```

---

### Task 4: 빌드 검증

- [ ] **Step 1: 프로덕션 빌드**

Run: `cd web && npm run build`
Expected: ✓ Compiled successfully, 정적 페이지 생성 정상.

빌드 실패 시:
- "use client" 누락 → Task 2의 AnnouncementBar.tsx 첫 줄 확인
- import 경로 → Task 3의 `@/components/AnnouncementBar` 경로 확인
- TypeScript 에러 → Task 1의 `Announcement` 타입과 Task 2의 `Announcement` 사용처 시그니처 일치 확인

---

### Task 5: dev server 시각·동작 검증

- [ ] **Step 1: dev server 실행**

Run: `cd web && npm run dev`

- [ ] **Step 2: 메인 페이지에서 띠 확인**

브라우저에서 `http://localhost:3000` 접속.

확인 항목:
- 헤더 바로 아래 deep ink 배경 띠 1줄 표시
- 좌측 이모지 + 메시지 텍스트 + 우측 도트 3개 + ✕
- 5초 후 두 번째 메시지로 페이드 전환
- 다시 5초 후 세 번째 메시지
- 다시 5초 후 첫 번째로 (3개 cycle)

- [ ] **Step 3: hover 일시정지 확인**

띠 위에 마우스 hover → 회전 멈춤. 마우스 떼면 재개.

- [ ] **Step 4: 도트 클릭 확인**

도트 클릭 → 해당 인덱스 메시지로 즉시 점프.

- [ ] **Step 5: 메시지 클릭 동선**

각 메시지 클릭 → 해당 href로 이동:
- "🎉 한능검 78회 ..." → `/exam/78/1` (78회 데이터가 업로드된 상태인지 확인)
- "🆕 78회 기출 ..." → `/exam`
- "📚 9급 공무원 ..." → `/9급-국가직-일반행정`

만약 `/exam/78/1`이 404면 → 78회 데이터 업로드가 아직 안 됐거나 다른 세션의 작업이 push 안 된 상태. 데이터 push 후 다시 시도 (Task 1의 메시지는 일단 그대로 두고, 시험 데이터 push되면 자동 동작).

- [ ] **Step 6: ✕ dismiss 동작**

✕ 클릭 → 띠 사라짐.
새로고침 → 띠 여전히 안 나타남 (localStorage에 dismiss until 저장됨).
DevTools Application > Local Storage > `announcement_dismissed_until` 항목 확인 (값 = ms timestamp).

브라우저 콘솔에서 강제로 풀기:
```js
localStorage.removeItem('announcement_dismissed_until')
```
새로고침 → 띠 다시 나타남.

- [ ] **Step 7: 다른 페이지에서도 띠 확인**

`/notes`, `/exam`, `/study` 각각 접속 → 헤더 아래 띠가 동일하게 표시 (모든 페이지 공통 mount 검증).

- [ ] **Step 8: 모바일(375) 시각**

DevTools에서 viewport 모바일로 전환:
- 띠 높이 36px
- 텍스트 길어도 truncate (`...`)
- 도트 인디케이터는 hidden (md: 부터 표시)
- ✕는 표시
- 메시지 클릭 시 truncate 텍스트라도 정상 페이지 이동

---

### Task 6: SEO 자산 무손상 검증

- [ ] **Step 1: View Source 확인**

브라우저에서 `http://localhost:3000` → 우클릭 → "페이지 소스 보기".

확인 항목 (이전과 동일해야 함):
- `<title>` "기출노트 — 한능검 기출문제와 요약노트 무료"
- `<meta name="description">` 한능검 정의문
- `<meta name="keywords">` 23개 키워드 (한능검·공무원)
- `<script type="application/ld+json">` EducationalOrganization·WebSite 스키마

- [ ] **Step 2: H1 확인**

페이지 소스에서 `<h1` 검색 → 첫 `<h1>`이 여전히 한능검 Hero. AnnouncementBar는 `<aside>` + `<a>` + `<span>`만 사용해서 heading hierarchy 미변경.

- [ ] **Step 3: a11y 속성 확인**

페이지 소스에서 `aria-live` 검색 → `aria-live="polite"` 발견. AnnouncementBar에 정상 적용됨.

- [ ] **Step 4: JSON-LD 개수 무변경**

페이지 소스에서 `application/ld+json` 검색 → script 태그 개수가 AnnouncementBar 추가 전과 동일.

---

### Task 7: 최종 정리 + push

- [ ] **Step 1: git status + log 확인**

Run:
```
git status
git log -5 --oneline
```

Expected: 직전 3개 커밋이 announcement 관련 (Task 1·2·3).

- [ ] **Step 2: main에 push (자동 배포)**

Run: `git push origin main`

Expected: Vercel 자동 배포 트리거 → 2~3분 후 https://gcnote.co.kr 모든 페이지에서 띠 노출.

⚠ 만약 non-fast-forward 에러 → 멈추고 사용자에게 보고. force push 금지.

- [ ] **Step 3: 프로덕션 시각 재확인**

배포 완료 후 https://gcnote.co.kr 접속:
- 헤더 직후 띠 정상 표시
- 5초 자동 회전
- ✕ 동작
- 메시지 클릭 시 정상 페이지 이동 (78회 데이터 업로드 완료 가정)

문제 발생 시 `git revert HEAD~2..HEAD` 3개 커밋 한꺼번에 롤백.

---

## 비고

- **메시지 갱신 절차**: `web/lib/announcements.ts`의 `ANNOUNCEMENTS` 배열 수정 → 커밋 + push → Vercel 자동 배포 (2~3분 반영). 갱신 빈도 낮으면 (월 1~2회) 이 방식이 가장 간단.
- **만료 메시지 자동 제외**: `expiresAt` 지난 메시지는 자동 회전에서 빠짐 → 굳이 코드에서 지울 필요 없음 (배포 1회로 만료 발효).
- **78회 데이터 의존**: 메시지 1·2가 78회 시험 데이터 업로드 완료를 전제로 함. 다른 세션의 78회 push가 main에 반영된 후 이 plan을 실행해야 사용자가 클릭했을 때 정상 동작.
- **AdSense 영향**: AdSense 광고 영역과 시각적으로 겹치지 않음 (헤더 직후 vs 페이지 내부). 광고 정책 위반 가능성 낮지만 게재 후 모니터링 권장.
- **롤백 안전성**: 3개 커밋 분리 → `git revert` 단위로 정확한 부분만 되돌리기 가능.
