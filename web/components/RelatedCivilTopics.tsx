import Link from "next/link";
import { getNoteForSubjectLabel, getNoteTopicsIndex } from "@/lib/civil-notes";

/**
 * Subject + question text → 매칭되는 9급 단권화 단원 추천 (서버 컴포넌트).
 *
 * 매칭 전략:
 * 1. Subject label로 우리 13개 노트 매칭
 * 2. 매칭 노트의 단원 keywords와 question text 부분문자열 매칭
 * 3. 매칭 키워드 수 많은 순 → 상위 3개
 */
interface RelatedCivilTopicsProps {
  subjectLabel: string;
  questionText: string;
  choicesText?: string;
}

export default function RelatedCivilTopics({
  subjectLabel,
  questionText,
  choicesText = "",
}: RelatedCivilTopicsProps) {
  const note = getNoteForSubjectLabel(subjectLabel);
  if (!note) return null;

  const topics = getNoteTopicsIndex(note.slug);
  if (topics.length === 0) return null;

  const haystack = `${questionText} ${choicesText}`;

  // 단원별 매칭 점수
  type Scored = { topic: typeof topics[number]; score: number; matched: string[] };
  const scored: Scored[] = topics
    .map((t) => {
      const matched = t.keywords.filter((k) => haystack.includes(k));
      return { topic: t, score: matched.length, matched };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || b.topic.freq - a.topic.freq);

  // 매칭 0이면 단원 1, 2 (가장 빈출) fallback
  const display = scored.length > 0 ? scored.slice(0, 3) : null;

  if (!display) {
    // 그래도 노트 자체 링크는 보여줌
    return (
      <section
        style={{
          margin: "20px 0",
          padding: "16px 20px",
          background: "var(--gc-paper, #fff)",
          border: "1px solid #FED7AA",
          borderRadius: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 18 }}>📝</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1F1A14" }}>
            {subjectLabel} 자동 단권화 — {note.topics}단원
          </span>
        </div>
        <p style={{ fontSize: 12, color: "#5A4F3F", margin: "0 0 10px" }}>
          이 과목 핵심 정리. 빈출 100% 커버.
        </p>
        <Link
          href={`/civil-notes/${note.slug}`}
          style={{
            display: "inline-block",
            fontSize: 12,
            color: "#B45309",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          전체 단권화 보기 →
        </Link>
      </section>
    );
  }

  return (
    <section
      style={{
        margin: "20px 0",
        padding: "20px 22px",
        background: "var(--gc-paper, #fff)",
        border: "1px solid #FED7AA",
        borderRadius: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 18 }}>📝</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#1F1A14" }}>
          관련 {subjectLabel} 단권화 단원
        </span>
        <span
          style={{
            fontSize: 10,
            color: "#B45309",
            background: "#FFF7ED",
            padding: "2px 8px",
            borderRadius: 999,
            fontWeight: 700,
            fontFamily: "var(--gc-font-mono, monospace)",
          }}
        >
          AUTO MATCH
        </span>
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
        {display.map(({ topic, score, matched }) => (
          <li key={topic.topicId}>
            <Link
              href={`/civil-notes/${note.slug}/${topic.topicId}`}
              style={{
                display: "block",
                padding: "10px 14px",
                background: "var(--gc-bg, #F5EFE4)",
                borderRadius: 8,
                textDecoration: "none",
                color: "#1F1A14",
                fontSize: 13,
                transition: "background 0.15s",
              }}
              className="related-topic"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontFamily: "var(--gc-font-mono, monospace)",
                    fontSize: 10,
                    color: "#94724D",
                    minWidth: 24,
                  }}
                >
                  {String(topic.ord).padStart(2, "0")}
                </span>
                <span style={{ fontWeight: 700 }}>{topic.title}</span>
                {topic.freq > 0 && (
                  <span style={{ fontSize: 10, color: "#B45309", fontWeight: 700 }}>
                    [출제 {topic.freq}회]
                  </span>
                )}
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 10,
                    color: "#B45309",
                    fontFamily: "var(--gc-font-mono, monospace)",
                  }}
                >
                  매칭 {score}
                </span>
              </div>
              {matched.length > 0 && (
                <div style={{ marginTop: 4, fontSize: 11, color: "#5A4F3F" }}>
                  {matched.slice(0, 4).join(" · ")}
                  {matched.length > 4 && ` 외 ${matched.length - 4}`}
                </div>
              )}
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href={`/civil-notes/${note.slug}`}
        style={{
          display: "block",
          marginTop: 12,
          fontSize: 12,
          color: "#B45309",
          fontWeight: 700,
          textDecoration: "none",
          textAlign: "right",
        }}
      >
        {subjectLabel} 전체 {note.topics}단원 보기 →
      </Link>

      <style>{`
        .related-topic:hover {
          background: #FFF7ED !important;
        }
      `}</style>
    </section>
  );
}
