import Link from "next/link";
import type { Metadata } from "next";
import { getCivilNoteIndex } from "@/lib/civil-notes";

export const metadata: Metadata = {
  title: { absolute: "9급 공무원 자동 단권화 — 13개 과목 무료 요약노트 | 기출노트" },
  description:
    "9급 국가직 공무원 13개 전공·공통과목 자동 단권화 요약노트. 행정법·행정학·형법·형사소송법·회계학·세법·교정학·사회복지·교육·국제법·관세법·국어·영어. 200문제 시드 + 빈출 주제 100% 커버리지.",
  keywords: [
    "9급 공무원 요약노트",
    "9급 국가직 단권화",
    "행정법 요약",
    "행정학 요약",
    "형법총론 요약",
    "9급 공무원 무료",
    "공무원 단권화 노트",
    "9급 PSAT 국어",
    "9급 영어 어휘",
  ],
  openGraph: {
    title: "9급 공무원 자동 단권화 — 13개 과목 무료 요약노트",
    description:
      "9급 국가직 13개 전공·공통과목 합격선 수준 단권화. 행정법 28단원·행정학 13단원·형법 14단원 등.",
    type: "website",
    url: "https://gcnote.co.kr/civil-notes",
  },
};

export default function CivilNotesIndex() {
  const notes = getCivilNoteIndex();
  return (
    <main
      style={{
        background: "var(--gc-bg)",
        minHeight: "calc(100vh - 68px)",
        paddingTop: 48,
        paddingBottom: 96,
      }}
    >
      <div className="mx-auto max-w-[1080px] px-6">
        <header style={{ marginBottom: 40 }}>
          <div
            style={{
              fontFamily: "var(--gc-font-mono, monospace)",
              fontSize: 11,
              letterSpacing: "0.18em",
              color: "var(--gc-amber)",
              fontWeight: 700,
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Auto Summary Note · Civil Service
          </div>
          <h1
            className="font-serif-kr"
            style={{
              fontSize: "clamp(32px, 5vw, 48px)",
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "var(--gc-ink)",
              margin: 0,
            }}
          >
            9급 공무원 <span style={{ color: "var(--gc-amber)" }}>자동 단권화</span>
          </h1>
          <p
            style={{
              fontSize: 16,
              color: "var(--gc-subtle, #5A4F3F)",
              maxWidth: 640,
              marginTop: 16,
              lineHeight: 1.7,
            }}
          >
            9급 국가직 13개 과목, 회당 200문제 시드 분석으로 자동 분류한 단권화 요약노트.
            전 회차 빈출 주제 100% 커버. 학원 단권화 개론 수준 (단원당 1,000~1,500자).
          </p>
          <div
            style={{
              marginTop: 20,
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              fontFamily: "var(--gc-font-mono, monospace)",
              fontSize: 12,
              color: "var(--gc-subtle, #5A4F3F)",
            }}
          >
            <span>📚 13과목</span>
            <span>·</span>
            <span>📊 5,290문제 시드</span>
            <span>·</span>
            <span>✅ 빈출 주제 100% 커버</span>
            <span>·</span>
            <span>🆓 완전 무료</span>
          </div>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {notes.map((n) => (
            <Link
              key={n.slug}
              href={`/civil-notes/${n.slug}`}
              style={{
                display: "block",
                background: "#fff",
                border: "1px solid var(--gc-hairline, rgba(31,26,20,.12))",
                borderRadius: 14,
                padding: "20px 22px",
                textDecoration: "none",
                color: "inherit",
                transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
              }}
              className="civil-note-card"
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 28, lineHeight: 1 }}>{n.icon}</span>
                <h2
                  className="font-serif-kr"
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    margin: 0,
                    color: "var(--gc-ink)",
                    letterSpacing: "-0.015em",
                  }}
                >
                  {n.subject}
                </h2>
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--gc-subtle, #5A4F3F)",
                  lineHeight: 1.6,
                  margin: "0 0 12px",
                  minHeight: 42,
                }}
              >
                {n.subtitle}
              </p>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  fontFamily: "var(--gc-font-mono, monospace)",
                  fontSize: 11,
                  color: "var(--gc-subtle, #94724D)",
                  paddingTop: 10,
                  borderTop: "1px solid var(--gc-hairline, rgba(31,26,20,.08))",
                }}
              >
                <span>📋 {n.topics}단원</span>
                <span>·</span>
                <span>🔑 {n.keywords}키워드</span>
                <span style={{ marginLeft: "auto", color: "var(--gc-amber)", fontWeight: 700 }}>
                  열기 →
                </span>
              </div>
            </Link>
          ))}
        </div>

        <section
          style={{
            marginTop: 56,
            padding: "28px 32px",
            background: "#fff",
            border: "1px solid var(--gc-hairline, rgba(31,26,20,.12))",
            borderRadius: 14,
          }}
        >
          <h2
            className="font-serif-kr"
            style={{ fontSize: 22, fontWeight: 800, margin: "0 0 12px", color: "var(--gc-ink)" }}
          >
            왜 자동 단권화인가?
          </h2>
          <ul style={{ paddingLeft: 20, lineHeight: 1.8, color: "var(--gc-subtle, #5A4F3F)", fontSize: 14 }}>
            <li>
              <strong>출제 빈도 기반 정렬</strong>: 시험 10회 + 검증 2회 = 200~440문제 분석으로 단원별 출제 빈도 표시
            </li>
            <li>
              <strong>커버리지 100%</strong>: <code>verify-v2.mjs</code> 자동 검증으로 빈출 주제 누락 0건
            </li>
            <li>
              <strong>합격선 깊이</strong>: 단원당 1,000~1,500자 — 100점 보장은 X, 80점+ 안정 합격선
            </li>
            <li>
              <strong>완전 무료 + 광고 도배 없음</strong>: 기출문제도 자동 채점 + 통계 모두 무료
            </li>
          </ul>
        </section>
      </div>

      <style>{`
        .civil-note-card:hover {
          transform: translateY(-2px);
          border-color: var(--gc-amber) !important;
          box-shadow: 0 8px 20px rgba(180, 83, 9, 0.08);
        }
      `}</style>
    </main>
  );
}
