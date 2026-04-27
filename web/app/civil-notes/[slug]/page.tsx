import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getCivilNote,
  getAllCivilNoteSlugs,
  getCivilNoteIndex,
  getNoteTopicsIndex,
} from "@/lib/civil-notes";

export const dynamic = "force-static";

export async function generateStaticParams() {
  return getAllCivilNoteSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const note = getCivilNote(slug);
  if (!note) return { title: "노트 없음 | 기출노트" };

  const title = `${note.subject} 자동 단권화 — ${note.topics.length}단원 무료 요약노트 | 9급 공무원`;
  const description = `${note.examLabel} ${note.subject} 자동 단권화. ${note.topics.length}단원 / 빈출 주제 100% 커버. 200문제 시드 분석. ${note.keywords.slice(0, 8).join(" · ")}`;
  const url = `https://gcnote.co.kr/civil-notes/${note.slug}`;

  return {
    title,
    description,
    keywords: [
      `${note.subject} 요약`,
      `${note.subject} 단권화`,
      `9급 ${note.subject}`,
      `9급 국가직 ${note.subject}`,
      `${note.subject} 무료`,
      `${note.subject} 노트`,
      ...note.keywords.slice(0, 6),
    ],
    openGraph: { title, description, type: "article", url },
    alternates: { canonical: url },
  };
}

export default async function CivilNotePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const note = getCivilNote(slug);
  if (!note) notFound();

  const allNotes = getCivilNoteIndex();
  const others = allNotes.filter((n) => n.slug !== slug).slice(0, 6);

  // JSON-LD Article
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${note.subject} 자동 단권화 — ${note.topics.length}단원 무료 요약노트`,
    description: `${note.examLabel} ${note.subject} 자동 단권화. ${note.topics.length}단원 / 빈출 주제 100% 커버.`,
    inLanguage: "ko",
    learningResourceType: "요약노트",
    educationalLevel: "9급 공무원 시험",
    isAccessibleForFree: true,
    about: note.keywords.slice(0, 10),
    publisher: {
      "@type": "Organization",
      name: "기출노트 — 한능검",
      url: "https://gcnote.co.kr",
    },
    url: `https://gcnote.co.kr/civil-notes/${note.slug}`,
    dateModified: note.updated,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* 노트 자체 스타일 인젝트 (스코프되어 외부엔 영향 X — 단권화 노트는 .container 내부에서만 동작) */}
      <style dangerouslySetInnerHTML={{ __html: note.style }} />

      <nav
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "20px 24px 0",
          fontSize: 12,
          color: "var(--gc-subtle, #5A4F3F)",
          fontFamily: "var(--gc-font-mono, monospace)",
        }}
      >
        <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>홈</Link>
        <span style={{ margin: "0 8px" }}>›</span>
        <Link href="/civil-notes" style={{ color: "inherit", textDecoration: "none" }}>9급 공무원 단권화</Link>
        <span style={{ margin: "0 8px" }}>›</span>
        <span style={{ color: "var(--gc-amber)" }}>{note.subject}</span>
      </nav>

      {/* 단원 빠른 이동 (long-tail SEO + UX) */}
      <section
        style={{
          maxWidth: 980,
          margin: "20px auto 0",
          padding: "20px 28px",
          background: "#fff",
          border: "1px solid rgba(31,26,20,.12)",
          borderRadius: 14,
        }}
      >
        <h2
          className="font-serif-kr"
          style={{ fontSize: 18, fontWeight: 800, margin: "0 0 12px", color: "#1F1A14" }}
        >
          📚 단원별 바로가기 ({(() => {
            const t = getNoteTopicsIndex(note.slug);
            return t.length;
          })()})
        </h2>
        <ol
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 6,
          }}
        >
          {getNoteTopicsIndex(note.slug).map((t) => (
            <li key={t.topicId}>
              <Link
                href={`/civil-notes/${slug}/${t.topicId}`}
                style={{
                  display: "block",
                  padding: "8px 12px",
                  fontSize: 13,
                  color: "#1F1A14",
                  borderRadius: 6,
                  textDecoration: "none",
                  transition: "background 0.15s",
                }}
                className="topic-link"
              >
                <span style={{ color: "#94724D", marginRight: 6, fontFamily: "var(--mono, monospace)", fontSize: 11 }}>
                  {String(t.ord).padStart(2, "0")}
                </span>
                {t.title}
                {t.freq > 0 && (
                  <span style={{ marginLeft: 6, fontSize: 10, color: "#B45309", fontWeight: 700 }}>
                    [{t.freq}회]
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <style>{`
        .topic-link:hover {
          background: #FFF7ED;
          color: #B45309 !important;
        }
      `}</style>

      {/* 본문 — 원본 HTML 그대로 인젝트 */}
      <div dangerouslySetInnerHTML={{ __html: note.body }} />

      {/* 다른 과목 추천 */}
      <section
        style={{
          maxWidth: 980,
          margin: "0 auto 64px",
          padding: "32px",
          background: "#fff",
          border: "1px solid rgba(31,26,20,.12)",
          borderRadius: 14,
        }}
      >
        <h2
          className="font-serif-kr"
          style={{ fontSize: 22, fontWeight: 800, margin: "0 0 16px", color: "var(--gc-ink)" }}
        >
          다른 9급 과목 단권화 보기
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {others.map((n) => (
            <Link
              key={n.slug}
              href={`/civil-notes/${n.slug}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 14px",
                background: "var(--gc-bg, #F5EFE4)",
                borderRadius: 10,
                textDecoration: "none",
                color: "inherit",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <span style={{ fontSize: 20 }}>{n.icon}</span>
              <span>{n.subject}</span>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--gc-amber)" }}>
                {n.topics}단원
              </span>
            </Link>
          ))}
        </div>
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <Link
            href="/civil-notes"
            style={{
              display: "inline-block",
              padding: "10px 20px",
              background: "var(--gc-amber)",
              color: "#fff",
              borderRadius: 8,
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            전체 13개 과목 보기 →
          </Link>
        </div>
      </section>
    </>
  );
}
