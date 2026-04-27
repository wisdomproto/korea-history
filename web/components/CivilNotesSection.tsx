import Link from "next/link";
import { getCivilNoteIndex } from "@/lib/civil-notes";

/**
 * 9급 공무원 자동 단권화 노트 13개 카드 섹션 — 홈 노출용.
 * 한능검 사이트의 부가 가치 콘텐츠 (cross-sell).
 */
export default function CivilNotesSection() {
  const notes = getCivilNoteIndex();
  if (notes.length === 0) return null;

  return (
    <section
      style={{
        background: "var(--gc-paper, #fff)",
        borderTop: "1px solid var(--gc-hairline, rgba(31,26,20,.08))",
        padding: "64px 0",
      }}
    >
      <div className="mx-auto max-w-[1080px] px-6">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div
              style={{
                fontFamily: "var(--gc-font-mono, monospace)",
                fontSize: 11,
                letterSpacing: "0.18em",
                color: "var(--gc-amber)",
                fontWeight: 700,
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Auto Summary Note · 9급 공무원
            </div>
            <h2
              className="font-serif-kr"
              style={{
                fontSize: "clamp(24px, 3vw, 32px)",
                fontWeight: 900,
                margin: 0,
                color: "var(--gc-ink)",
                letterSpacing: "-0.015em",
              }}
            >
              <span style={{ color: "var(--gc-amber)" }}>9급 공무원</span> 단권화 노트 (13과목)
            </h2>
            <p style={{ fontSize: 14, color: "var(--gc-subtle, #5A4F3F)", margin: "8px 0 0", lineHeight: 1.6 }}>
              200문제 시드 분석 + 빈출 주제 100% 커버 · 학원 단권화 개론 수준 · 완전 무료
            </p>
          </div>
          <Link
            href="/civil-notes"
            style={{
              padding: "10px 18px",
              background: "var(--gc-ink)",
              color: "#fff",
              borderRadius: 8,
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            전체 보기 →
          </Link>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {notes.map((n) => (
            <Link
              key={n.slug}
              href={`/civil-notes/${n.slug}`}
              style={{
                display: "block",
                padding: "16px 18px",
                background: "var(--gc-bg, #F5EFE4)",
                borderRadius: 12,
                textDecoration: "none",
                color: "inherit",
                transition: "transform 0.15s ease",
              }}
              className="civil-cross-card"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 22, lineHeight: 1 }}>{n.icon}</span>
                <span
                  className="font-serif-kr"
                  style={{ fontSize: 16, fontWeight: 800, color: "var(--gc-ink)", letterSpacing: "-0.01em" }}
                >
                  {n.subject}
                </span>
              </div>
              <div
                style={{
                  fontFamily: "var(--gc-font-mono, monospace)",
                  fontSize: 11,
                  color: "var(--gc-subtle, #94724D)",
                }}
              >
                {n.topics}단원 · {n.keywords}키워드
              </div>
            </Link>
          ))}
        </div>
      </div>
      <style>{`
        .civil-cross-card:hover {
          transform: translateY(-1px);
          background: #fff !important;
          box-shadow: 0 4px 12px rgba(180, 83, 9, 0.06);
        }
      `}</style>
    </section>
  );
}
