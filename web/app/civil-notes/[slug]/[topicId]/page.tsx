import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getCivilNote,
  getCivilTopic,
  getNoteTopicsIndex,
  getAllTopicParams,
  getQuestionsForTopic,
} from "@/lib/civil-notes";

export const dynamic = "force-static";

export async function generateStaticParams() {
  return getAllTopicParams().map(({ slug, topicId }) => ({ slug, topicId }));
}

// 노트 slug → 그 과목의 대표 9급 직렬 (기출문제 링크용)
function getSubjectSlugForNote(noteSlug: string): { examSlug: string; subjectSlug: string } {
  // 모든 노트는 9급 국가직 직렬 자식 페이지로 연결.
  // 가장 응시자 많은 직렬 = 일반행정 (한국사·국어·영어·행정법·행정학)
  // 그 외 전공은 그 전공 직렬로
  const map: Record<string, { examSlug: string; subjectSlug: string }> = {
    "admin-law": { examSlug: "9급-국가직-일반행정", subjectSlug: "행정법" },
    "admin-pa": { examSlug: "9급-국가직-일반행정", subjectSlug: "행정학" },
    "korean": { examSlug: "9급-국가직-일반행정", subjectSlug: "국어" },
    "english": { examSlug: "9급-국가직-일반행정", subjectSlug: "영어" },
    "criminal-law": { examSlug: "9급-국가직-검찰사무", subjectSlug: "형법" },
    "criminal-procedure": { examSlug: "9급-국가직-검찰사무", subjectSlug: "형사소송법" },
    "accounting": { examSlug: "9급-국가직-세무", subjectSlug: "회계학" },
    "tax-law": { examSlug: "9급-국가직-세무", subjectSlug: "세법개론" },
    "corrections": { examSlug: "9급-국가직-교정", subjectSlug: "교정학개론" },
    "social-welfare": { examSlug: "9급-국가직-사회복지", subjectSlug: "사회복지학개론" },
    "education": { examSlug: "9급-국가직-교육행정", subjectSlug: "교육학개론" },
    "international-law": { examSlug: "9급-국가직-외무영사", subjectSlug: "국제법개론" },
    "customs-law": { examSlug: "9급-국가직-관세", subjectSlug: "관세법개론" },
  };
  return map[noteSlug] ?? { examSlug: "9급-국가직-일반행정", subjectSlug: "한국사" };
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string; topicId: string }> },
): Promise<Metadata> {
  const { slug, topicId } = await params;
  const topic = getCivilTopic(slug, topicId);
  const note = getCivilNote(slug);
  if (!topic || !note) return { title: "단원 없음 | 기출노트" };

  const title = `${topic.title} — ${note.subject} 단권화 | 9급 공무원`;
  const description = `${note.subject} ${topic.title}. ${topic.keywords.slice(0, 6).join(" · ")}. 9급 국가직 자동 단권화 ${topic.freq > 0 ? `· 출제 ${topic.freq}회` : ""}.`;
  const url = `https://gcnote.co.kr/civil-notes/${slug}/${topicId}`;

  return {
    title,
    description,
    keywords: [
      `9급 ${note.subject} ${topic.title}`,
      `${topic.title} 요약`,
      `${topic.title} 정리`,
      ...topic.keywords.slice(0, 8),
    ],
    openGraph: { title, description, type: "article", url },
    alternates: { canonical: url },
  };
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ slug: string; topicId: string }>;
}) {
  const { slug, topicId } = await params;
  const topic = getCivilTopic(slug, topicId);
  const note = getCivilNote(slug);
  if (!topic || !note) notFound();

  const allTopics = getNoteTopicsIndex(slug);
  const idx = allTopics.findIndex((t) => t.topicId === topicId);
  const prev = idx > 0 ? allTopics[idx - 1] : null;
  const next = idx < allTopics.length - 1 ? allTopics[idx + 1] : null;

  // 이 단원에서 출제된 기출문제 (역방향 인덱스)
  const relatedQuestions = getQuestionsForTopic(slug, topicId, 12);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${topic.title} — ${note.subject} 단권화`,
    description: `9급 공무원 ${note.subject} ${topic.title}. ${topic.keywords.slice(0, 8).join(", ")}.`,
    inLanguage: "ko",
    learningResourceType: "단권화 단원",
    educationalLevel: "9급 공무원 시험",
    isAccessibleForFree: true,
    about: topic.keywords.slice(0, 10),
    isPartOf: {
      "@type": "Article",
      name: `${note.subject} 자동 단권화`,
      url: `https://gcnote.co.kr/civil-notes/${slug}`,
    },
    publisher: {
      "@type": "Organization",
      name: "기출노트 — 한능검",
      url: "https://gcnote.co.kr",
    },
    url: `https://gcnote.co.kr/civil-notes/${slug}/${topicId}`,
  };

  // BreadcrumbList JSON-LD
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "홈", item: "https://gcnote.co.kr/" },
      { "@type": "ListItem", position: 2, name: "9급 공무원 단권화", item: "https://gcnote.co.kr/civil-notes" },
      {
        "@type": "ListItem",
        position: 3,
        name: note.subject,
        item: `https://gcnote.co.kr/civil-notes/${slug}`,
      },
      { "@type": "ListItem", position: 4, name: topic.title },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {/* 노트 자체 스타일 (cream/amber 디자인 시스템) */}
      <style dangerouslySetInnerHTML={{ __html: topic.style }} />

      <div className="mx-auto max-w-[1200px] px-5 py-6 md:py-8 md:flex md:gap-6" style={{ background: "var(--gc-bg, #F5EFE4)" }}>
        {/* 좌측 사이드바 — 다른 단원 리스트 */}
        <aside className="hidden md:block md:w-64 md:shrink-0">
          <div className="sticky top-20 space-y-2">
            <div className="rounded-2xl bg-white border border-[var(--gc-hairline)] p-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--gc-amber)] font-bold mb-2 px-1">
                {note.subject} 단원 ({allTopics.length})
              </div>
              <ul className="space-y-0.5 max-h-[calc(100vh-180px)] overflow-y-auto">
                {allTopics.map((t) => (
                  <li key={t.topicId}>
                    <Link
                      href={`/civil-notes/${slug}/${t.topicId}`}
                      className={`flex items-center gap-2 px-2.5 py-1.5 text-[13px] rounded-md transition-colors ${
                        t.topicId === topicId
                          ? "bg-[#FFF7ED] text-[var(--gc-amber)] font-bold"
                          : "text-[var(--gc-ink)] hover:bg-[var(--gc-bg)] hover:text-[var(--gc-amber)]"
                      }`}
                    >
                      <span className="font-mono text-[10px] text-slate-400 shrink-0">{String(t.ord).padStart(2, "0")}</span>
                      <span className="flex-1 truncate">{t.title}</span>
                      {t.freq > 0 && (
                        <span className="text-[9px] text-[var(--gc-amber)] font-bold shrink-0">{t.freq}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>

        {/* 우측 본문 */}
        <div className="flex-1 min-w-0">
        <nav style={{ fontSize: 12, color: "#94724D", marginBottom: 16, fontFamily: "var(--mono, monospace)" }}>
          <Link href="/civil-notes" style={{ color: "inherit", textDecoration: "none" }}>
            9급 공무원 단권화
          </Link>
          <span style={{ margin: "0 8px" }}>›</span>
          <Link href={`/civil-notes/${slug}`} style={{ color: "inherit", textDecoration: "none" }}>
            {note.subject}
          </Link>
          <span style={{ margin: "0 8px" }}>›</span>
          <span style={{ color: "#B45309", fontWeight: 700 }}>{topic.title}</span>
        </nav>

        <header
          style={{
            marginBottom: 24,
            paddingBottom: 16,
            borderBottom: "2px solid #1F1A14",
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono, monospace)",
              fontSize: 11,
              letterSpacing: "0.18em",
              color: "#B45309",
              fontWeight: 700,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            단원 {topic.ord} · {note.subject}
          </div>
          <h1
            className="font-serif-kr"
            style={{
              fontSize: "clamp(26px, 4vw, 36px)",
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: "-0.015em",
              margin: 0,
              color: "#1F1A14",
            }}
          >
            {topic.title}
          </h1>
          {topic.freq > 0 && (
            <div style={{ marginTop: 12, fontSize: 13, color: "#5A4F3F" }}>
              📊 출제 빈도: <strong style={{ color: "#B45309" }}>{topic.freq}회</strong>
              {" · "}
              📝 분량 약 {Math.round(topic.chars / 100) * 100}자
            </div>
          )}
          {topic.keywords.length > 0 && (
            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
              }}
            >
              {topic.keywords.slice(0, 12).map((k) => (
                <span
                  key={k}
                  style={{
                    fontSize: 11,
                    padding: "4px 9px",
                    background: "#FED7AA",
                    color: "#B45309",
                    borderRadius: 999,
                    fontWeight: 600,
                  }}
                >
                  {k}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* 단원 본문 — 원본 HTML */}
        <article dangerouslySetInnerHTML={{ __html: topic.html }} />

        {/* 이 단원에서 출제된 기출문제 (역방향 자동 매칭) */}
        {relatedQuestions.length > 0 && (
          <section
            style={{
              margin: "32px 0 0",
              padding: "24px 28px",
              background: "#fff",
              border: "1px solid rgba(31,26,20,.12)",
              borderRadius: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                marginBottom: 12,
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <h2
                className="font-serif-kr"
                style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "#1F1A14" }}
              >
                📝 이 단원에서 출제된 기출 ({relatedQuestions.length})
              </h2>
              <span
                style={{
                  fontSize: 10,
                  color: "#B45309",
                  background: "#FFF7ED",
                  padding: "3px 9px",
                  borderRadius: 999,
                  fontWeight: 700,
                  fontFamily: "var(--mono, monospace)",
                }}
              >
                AUTO MATCH · 5,290문제 사전 인덱스
              </span>
            </div>
            <p style={{ fontSize: 12, color: "#5A4F3F", margin: "0 0 14px" }}>
              단원 키워드 매칭 점수 높은 순. 클릭하면 해당 기출문제로 이동.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
              {relatedQuestions.map((q) => (
                <li key={`${q.examId}-${q.questionNumber}`}>
                  <Link
                    href={(() => {
                      const r = getSubjectSlugForNote(slug);
                      return `/${encodeURIComponent(r.examSlug)}/${encodeURIComponent(r.subjectSlug)}/exam/${q.examId}/${q.questionNumber}`;
                    })()}
                    style={{
                      display: "block",
                      padding: "10px 14px",
                      background: "#F5EFE4",
                      borderRadius: 8,
                      textDecoration: "none",
                      color: "#1F1A14",
                      fontSize: 13,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span
                        style={{
                          fontFamily: "var(--mono, monospace)",
                          fontSize: 10,
                          color: "#94724D",
                          fontWeight: 700,
                        }}
                      >
                        {q.examLabel.replace(/^9급 국가직 공무원\s*/, "").slice(0, 28)} · {q.questionNumber}번
                      </span>
                      <span
                        style={{
                          marginLeft: "auto",
                          fontSize: 10,
                          color: "#B45309",
                          fontFamily: "var(--mono, monospace)",
                          fontWeight: 700,
                        }}
                      >
                        매칭 {q.score}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: "#1F1A14", lineHeight: 1.5 }}>
                      {q.qPreview}
                      {q.qPreview.length >= 100 && "…"}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* prev / next */}
        <nav
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            margin: "48px 0 24px",
            padding: "20px 0",
            borderTop: "1px solid rgba(31,26,20,.12)",
            borderBottom: "1px solid rgba(31,26,20,.12)",
          }}
        >
          {prev ? (
            <Link
              href={`/civil-notes/${slug}/${prev.topicId}`}
              style={{
                flex: 1,
                padding: "14px 18px",
                background: "#fff",
                borderRadius: 10,
                textDecoration: "none",
                color: "#1F1A14",
                border: "1px solid rgba(31,26,20,.12)",
              }}
            >
              <div style={{ fontSize: 11, color: "#94724D", fontFamily: "var(--mono, monospace)", marginBottom: 4 }}>
                ← 이전 단원
              </div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{prev.title}</div>
            </Link>
          ) : (
            <div style={{ flex: 1 }} />
          )}
          {next ? (
            <Link
              href={`/civil-notes/${slug}/${next.topicId}`}
              style={{
                flex: 1,
                padding: "14px 18px",
                background: "#fff",
                borderRadius: 10,
                textDecoration: "none",
                color: "#1F1A14",
                textAlign: "right",
                border: "1px solid rgba(31,26,20,.12)",
              }}
            >
              <div style={{ fontSize: 11, color: "#94724D", fontFamily: "var(--mono, monospace)", marginBottom: 4 }}>
                다음 단원 →
              </div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{next.title}</div>
            </Link>
          ) : (
            <div style={{ flex: 1 }} />
          )}
        </nav>

        </div>{/* 우측 본문 끝 */}
      </div>{/* flex wrapper 끝 */}
    </>
  );
}
