"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const NAV_ITEMS = [
  { href: "/exam",          label: "기출문제", match: ["/exam", "/study"] },
  { href: "/notes",         label: "요약노트", match: ["/notes"] },
  { href: "/wrong-answers", label: "오답노트", match: ["/wrong-answers"] },
  { href: "/my-record",     label: "내 기록",   match: ["/my-record"] },
  { href: "/board",         label: "게시판",   match: ["/board"] },
];

const ink     = "var(--gc-ink)";
const subtle  = "var(--gc-subtle)";
const amber   = "var(--gc-amber)";
const paper   = "var(--gc-paper)";
const bg      = "var(--gc-bg)";
const hair    = "var(--gc-hairline)";

export default function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const isActive = (matches: string[]) =>
    matches.some((m) => pathname === m || pathname.startsWith(m + "/"));

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
            <span
              className="font-sans-kr"
              style={{
                fontSize: 14,
                color: amber,
                fontWeight: 800,
                marginLeft: 4,
                letterSpacing: "-0.01em",
              }}
            >
              한능검
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-7 shrink-0">
            {NAV_ITEMS.map(({ href, label, match }) => {
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

          <div className="flex-1" />

          {/* Search (hidden <1100px) */}
          <div
            className="gc-search hidden lg:flex items-center gap-2 whitespace-nowrap"
            style={{
              padding: "8px 14px",
              background: paper,
              border: `1px solid ${hair}`,
              borderRadius: 999,
              fontFamily: "var(--gc-font-sans)",
              fontSize: 13,
              color: subtle,
              minWidth: 220,
            }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
            <span>단원·키워드 검색</span>
            <span className="flex-1" />
            <span
              className="font-mono-kr"
              style={{
                fontSize: 10,
                padding: "2px 6px",
                borderRadius: 4,
                background: bg,
                color: subtle,
                fontWeight: 700,
              }}
            >
              ⌘ K
            </span>
          </div>

          {/* CTA */}
          <Link
            href="/exam"
            className="hidden md:inline-flex items-center gap-2 whitespace-nowrap no-underline shrink-0"
            style={{
              padding: "10px 20px",
              background: ink,
              color: bg,
              borderRadius: 999,
              fontFamily: "var(--gc-font-sans)",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            지금 풀기
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="m13 5 7 7-7 7" />
            </svg>
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
              {NAV_ITEMS.map(({ href, label, match }) => {
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
                href="/exam"
                className="mt-4 flex items-center justify-center gap-2 no-underline"
                style={{
                  padding: "14px",
                  background: ink,
                  color: bg,
                  borderRadius: 999,
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                지금 풀기
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="m13 5 7 7-7 7" />
                </svg>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
