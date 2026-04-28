"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import ExamSelector from "@/components/ExamSelector";
import { getExamSlugFromPath, getSubjectSlugFromPath } from "@/lib/exam-context";
import type { ExamType, Subject } from "@/lib/exam-types";

/**
 * Learning nav items (기출문제 / 요약노트 / 오답노트 / 내 기록).
 * 게시판은 별도 우측 노출이라 여기 포함 안 함.
 *
 * 표시 규칙:
 * - 한능검 / hub → legacy URLs (/exam, /notes, etc.)
 * - 단일 과목 시험 (한능검) → 위와 동일 (legacy) 또는 subject 단위
 * - 다과목 시험 페이지 (e.g. /9급-국가직) → null 반환 (학습 nav 숨김)
 * - 과목 컨텍스트 (e.g. /9급-국가직/국어) → 그 과목 디테일 URL
 */
function buildNavItems(
  examSlug: string | null,
  subjectSlugInUrl: string | null,
  isMultiSubjectExamPage: boolean,
): Array<{ href: string; label: string; match: string[] }> | null {
  if (isMultiSubjectExamPage) return null; // 시험 단위에선 학습 nav 숨김

  const isHistory = !examSlug || examSlug === "한능검";
  if (isHistory) {
    return [
      { href: "/exam", label: "기출문제", match: ["/exam", "/study", "/한능검"] },
      { href: "/notes", label: "요약노트", match: ["/notes"] },
      { href: "/blog", label: "블로그", match: ["/blog"] },
      { href: "/wrong-answers", label: "오답노트", match: ["/wrong-answers"] },
      { href: "/my-record", label: "내 기록", match: ["/my-record"] },
    ];
  }
  const base = `/${encodeURIComponent(examSlug)}`;
  const subjBase = subjectSlugInUrl ? `${base}/${encodeURIComponent(subjectSlugInUrl)}` : base;
  return [
    { href: `${subjBase}/exam`, label: "기출문제", match: [`${subjBase}/exam`] },
    { href: `${subjBase}/notes`, label: "요약노트", match: [`${subjBase}/notes`] },
    { href: `${subjBase}/wrong-answers`, label: "오답노트", match: [`${subjBase}/wrong-answers`] },
    { href: `${subjBase}/my-record`, label: "내 기록", match: [`${subjBase}/my-record`] },
  ];
}

const ink     = "var(--gc-ink)";
const subtle  = "var(--gc-subtle)";
const amber   = "var(--gc-amber)";
const paper   = "var(--gc-paper)";
const bg      = "var(--gc-bg)";
const hair    = "var(--gc-hairline)";

interface HeaderProps {
  examTypes: ExamType[];
  subjects: Subject[];
}

export default function Header({ examTypes, subjects }: HeaderProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const examSlug = getExamSlugFromPath(pathname);
  // Selector always visible. Default = 한능검 if no exam context (hub or site-wide pages).
  const DEFAULT_EXAM_SLUG = "한능검";
  const effectiveSlug = examSlug ?? DEFAULT_EXAM_SLUG;
  const currentExam = examTypes.find((e) => e.slug === effectiveSlug) ?? null;

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const isActive = (matches: string[]) =>
    matches.some((m) => pathname === m || pathname.startsWith(m + "/"));

  // getSubjectSlugFromPath: /[examSlug]/[subjectSlug]/... 형태일 때만 subjectSlug 반환
  // (legacy 사이트 라우트면 default "한국사" 반환, 그건 nav 분기에 영향 없음 — 한능검 분기로 가서 무시됨)
  const subjectSlugInUrl = getSubjectSlugFromPath(pathname);
  // 다과목 시험 페이지 (과목 미선택)인지 판정 — 학습 nav 숨김 조건
  const examData = examTypes.find((e) => e.slug === effectiveSlug);
  const liveSubjectCount = examData
    ? [
        ...examData.subjects.required,
        ...(examData.subjects.selectable ?? []),
      ].filter((r) => r.status === "live").length
    : 0;
  const isMultiSubjectExamPage =
    liveSubjectCount > 1 &&
    !subjectSlugInUrl &&
    pathname !== "/" &&
    !pathname.startsWith("/exam") &&
    !pathname.startsWith("/notes") &&
    !pathname.startsWith("/study") &&
    !pathname.startsWith("/wrong-answers") &&
    !pathname.startsWith("/my-record");

  const navItems = buildNavItems(effectiveSlug, subjectSlugInUrl, isMultiSubjectExamPage);

  return (
    <>
      <header
        className="sticky top-0 z-50 backdrop-blur-xl"
        style={{
          background: "rgba(245, 239, 228, 0.92)",
          borderBottom: `1px solid ${hair}`,
        }}
      >
        <div className="mx-auto flex h-[68px] max-w-[1280px] items-center gap-8 px-6 md:px-8">
          {/* Logo */}
          <Link
            href="/"
            className="flex shrink-0 items-baseline gap-1.5 whitespace-nowrap no-underline"
          >
            <span
              className="font-serif-kr"
              style={{
                fontSize: 26,
                fontWeight: 900,
                color: ink,
                letterSpacing: "-0.04em",
              }}
            >
              기출노트
            </span>
          </Link>

          {/* Exam selector — always visible, default = 한능검 */}
          <div className="hidden sm:block">
            <ExamSelector
              current={currentExam}
              currentSubjectSlug={subjectSlugInUrl}
              examTypes={examTypes}
              subjects={subjects}
            />
          </div>

          {/* Desktop Nav (학습 메뉴) — 다과목 시험 페이지에선 숨김 */}
          {navItems && (
            <nav className="hidden md:flex items-center gap-7 shrink-0">
              {navItems.map(({ href, label, match }) => {
                const active = isActive(match);
                return (
                  <Link
                    key={href}
                    href={href}
                    className="font-sans-kr no-underline transition-colors"
                    style={{
                      color: active ? ink : subtle,
                      fontSize: 15,
                      fontWeight: active ? 700 : 500,
                      padding: "8px 2px",
                      borderBottom: active
                        ? `2px solid ${amber}`
                        : "2px solid transparent",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          )}

          <div className="flex-1" />

          {/* 게시판 — 항상 우측 별도 노출 */}
          <Link
            href="/board"
            className="hidden md:flex font-sans-kr items-center gap-1 shrink-0 no-underline transition-colors"
            style={{
              color: pathname.startsWith("/board") ? ink : subtle,
              fontSize: 15,
              fontWeight: pathname.startsWith("/board") ? 700 : 500,
              padding: "8px 2px",
              borderBottom: pathname.startsWith("/board")
                ? `2px solid ${amber}`
                : "2px solid transparent",
            }}
          >
            게시판
          </Link>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
            style={{ color: ink }}
            aria-label="메뉴"
          >
            {mobileOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0"
            style={{ background: "rgba(20, 15, 10, 0.35)", backdropFilter: "blur(4px)" }}
            onClick={() => setMobileOpen(false)}
          />
          <nav
            className="absolute left-0 right-0 animate-fade-in"
            style={{
              top: 68,
              background: paper,
              borderBottom: `1px solid ${hair}`,
              boxShadow: "0 20px 40px rgba(20,15,10,0.12)",
            }}
          >
            <div className="mx-auto max-w-[1280px] px-6 py-3">
              {(navItems ?? []).map(({ href, label, match }) => {
                const active = isActive(match);
                return (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center no-underline transition-colors"
                    style={{
                      padding: "14px 4px",
                      fontSize: 16,
                      fontWeight: active ? 700 : 500,
                      color: active ? ink : subtle,
                      borderBottom: `1px solid ${hair}`,
                      fontFamily: "var(--gc-font-sans)",
                    }}
                  >
                    <span>{label}</span>
                    {active && (
                      <span
                        className="ml-auto w-1.5 h-1.5 rounded-full"
                        style={{ background: amber }}
                      />
                    )}
                  </Link>
                );
              })}
              <Link
                href="/board"
                className="flex items-center no-underline transition-colors"
                style={{
                  padding: "14px 4px",
                  fontSize: 16,
                  fontWeight: pathname.startsWith("/board") ? 700 : 500,
                  color: pathname.startsWith("/board") ? ink : subtle,
                  borderBottom: `1px solid ${hair}`,
                }}
              >
                <span>게시판</span>
                {pathname.startsWith("/board") && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: amber }} />
                )}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
