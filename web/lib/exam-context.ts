// URL → examSlug 추출 헬퍼.
// Phase 0:
//   /한능검/...           → "한능검"
//   /9급-국가직/...       → "9급-국가직"
//   /경찰공무원/...       → "경찰공무원"
//   /exam, /notes, /study, /wrong-answers, /my-record (legacy) → "한능검" default
//   /board, /admin, /privacy, /terms, /api (사이트 공통) → "한능검" default
//   /                    → null (hub, no exam context)

"use client";

import { usePathname } from "next/navigation";

const DEFAULT_EXAM_SLUG = "한능검";
const DEFAULT_SUBJECT_SLUG = "한국사";

// 사이트 공통 라우트 — 첫 segment가 이 중 하나면 examSlug 컨텍스트는 default(한능검)
const LEGACY_OR_SITE_SEGMENTS = new Set([
  "exam",
  "notes",
  "study",
  "wrong-answers",
  "my-record",
  "board",
  "admin",
  "privacy",
  "terms",
  "api",
]);

// 서브 라우트 segment (실제 시험-과목이 아님). 두 번째 segment가 이거면 subject가 아님.
const SUB_PAGE_SEGMENTS = new Set([
  "exam",
  "notes",
  "study",
  "wrong-answers",
  "my-record",
]);

/**
 * URL pathname에서 examSlug 추출. SSR-safe.
 * - 첫 segment가 site-wide route → 한능검 default
 * - 첫 segment가 다른 한국어/영문 → examSlug로 사용
 * - 빈 path (홈 hub) → null
 */
export function getExamSlugFromPath(pathname: string | null | undefined): string | null {
  if (!pathname) return null;
  const seg = pathname.split("/").filter(Boolean)[0];
  if (!seg) return null; // home hub
  if (LEGACY_OR_SITE_SEGMENTS.has(seg)) return DEFAULT_EXAM_SLUG;
  try {
    return decodeURIComponent(seg);
  } catch {
    return seg;
  }
}

/**
 * URL pathname에서 subjectSlug 추출. SSR-safe.
 * - /[examSlug]/[subjectSlug]/... 형태 → 두 번째 segment가 sub-page(`exam`/`notes`/...)가 아니면 subjectSlug
 * - 한능검 legacy URL이거나 examSlug만 있으면 default(한국사) 돌려줌
 */
export function getSubjectSlugFromPath(pathname: string | null | undefined): string | null {
  if (!pathname) return null;
  const segs = pathname.split("/").filter(Boolean);
  if (segs.length === 0) return null;
  const first = segs[0];

  // legacy 사이트 공통 라우트 → 한국사 default
  if (LEGACY_OR_SITE_SEGMENTS.has(first)) return DEFAULT_SUBJECT_SLUG;

  // /[examSlug] 단독 → 컨텍스트 없음
  if (segs.length === 1) return null;

  const second = segs[1];
  // /[examSlug]/exam, /[examSlug]/notes, ... → 시험 단위 sub-page (subject 컨텍스트 없음)
  if (SUB_PAGE_SEGMENTS.has(second)) return null;

  // /[examSlug]/[subjectSlug]/...
  try {
    return decodeURIComponent(second);
  } catch {
    return second;
  }
}

/**
 * React hook — 현재 라우트 기반 examSlug.
 * 홈/사이트 공통 라우트 → 한능검 default.
 */
export function useCurrentExamSlug(): string {
  const pathname = usePathname();
  return getExamSlugFromPath(pathname) ?? DEFAULT_EXAM_SLUG;
}

/**
 * React hook — 현재 라우트 기반 subjectSlug.
 * 시험 컨텍스트만 있고 과목 컨텍스트 없으면 한국사 default (한능검 호환).
 */
export function useCurrentSubjectSlug(): string {
  const pathname = usePathname();
  return getSubjectSlugFromPath(pathname) ?? DEFAULT_SUBJECT_SLUG;
}

/**
 * Hub 여부 — 메인 페이지인지 (시험 컨텍스트 없음)
 */
export function useIsHubRoute(): boolean {
  const pathname = usePathname();
  return pathname === "/" || pathname === "";
}
