// 메인 페이지 한능검 Hero 직후 다중 시험 cross-sell 띠.
// 디자인 결정: docs/superpowers/specs/2026-05-22-multi-exam-strip-design.md
//
// SEO 보호: H1/H2 미사용, JSON-LD 미주입. layout.tsx의 한능검 brand entity 시그널 보호.
// 칩 8개 = 단권화 노트 완성도 우선 (9급 직렬 5 + 자격증 2 + 전체 진입 1).

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

export default function MultiExamStrip() {
  return (
    <section
      role="complementary"
      aria-label="다른 시험 진입"
      className="px-5 sm:px-6 md:px-8 py-6 md:py-8"
      style={{
        background: "var(--gc-paper)",
        color: "var(--gc-ink)",
        borderTop: "1px solid var(--gc-amber)",
        borderBottom: "1px solid var(--gc-amber)",
      }}
    >
      <div className="max-w-6xl mx-auto">
        <p
          className="font-sans-kr text-base md:text-lg"
          style={{ fontWeight: 500 }}
        >
          공무원 시험도 같은 학습 시스템으로 — 9급 13과목 단원별 정리 완비
        </p>
        <p className="font-mono-kr text-xs mt-1 opacity-70">
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
              className="shrink-0 rounded-full px-4 py-2 text-sm font-sans-kr transition-colors hover:bg-[var(--gc-amber)] hover:text-[var(--gc-paper)]"
              style={{
                border: "1px solid var(--gc-amber)",
                color: "var(--gc-amber)",
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
              background: "var(--gc-ink)",
              color: "var(--gc-paper)",
              border: "1px solid var(--gc-ink)",
            }}
          >
            전체 547과목 →
          </Link>
        </div>
      </div>
    </section>
  );
}
