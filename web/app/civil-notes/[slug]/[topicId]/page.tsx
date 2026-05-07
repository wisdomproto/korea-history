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
import NotesShell from "@/components/notes/NotesShell";
import type { NoteGroup, NoteListItem, NotesShellMeta, BreadcrumbItem } from "@/components/notes/types";

const GROUP_COLORS = [
  "border-l-violet-500",
  "border-l-blue-500",
  "border-l-cyan-500",
  "border-l-emerald-500",
  "border-l-amber-500",
  "border-l-orange-500",
  "border-l-red-500",
  "border-l-pink-500",
  "border-l-purple-500",
  "border-l-teal-500",
];

// ISR — 274 단원 모두 첫 요청 시 SSR + 1일 캐시. 빌드 0개 prerender.
// 사용자 첫 접속 1~2초 지연, 이후 캐시 즉시.
export const revalidate = 86400;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
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
      {/* 노트 자체 스타일 (cream/amber 디자인 시스템) — Windows에서 읽힌 \r\n을 \n로 정규화해서 hydration mismatch 방지 */}
      <style dangerouslySetInnerHTML={{ __html: topic.style.replace(/\r\n/g, "\n") }} />

      {/* Generic NotesShell — 좌측 사이드바 + 우측 본문 (한능검과 동일 패턴) */}
      <NotesShell
        meta={buildShellMeta(note, allTopics.length)}
        groups={buildGroups(slug, allTopics)}
        breadcrumb={[
          { label: "홈", href: "/" },
          { label: "9급 공무원 단권화", href: "/civil-notes" },
          { label: note.subject, href: `/civil-notes/${slug}` },
          { label: topic.title },
        ]}
        activeId={topicId}
      >

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

      </NotesShell>
    </>
  );
}

// ─── Helpers (단권화 단원 → NotesShell 데이터) ───

function buildShellMeta(note: { subject: string }, totalTopics: number): NotesShellMeta {
  return {
    eyebrow: `Auto Summary Note · ${note.subject}`,
    titleAccent: note.subject,
    subtitle: `${totalTopics}단원 · 자동 단권화`,
    searchPlaceholder: `${totalTopics}단원 검색...`,
    quickActions: [],
  };
}

function buildGroups(slug: string, topics: ReturnType<typeof getNoteTopicsIndex>): NoteGroup[] {
  const items: NoteListItem[] = topics.map((t) => ({
    id: t.topicId,
    ord: t.ord,
    title: t.title,
    href: `/civil-notes/${slug}/${t.topicId}`,
    keywords: t.keywords,
    freqCount: t.freq,
  }));
  const groups: NoteGroup[] = [];
  const groupSize = 5;
  for (let i = 0; i < items.length; i += groupSize) {
    const groupNum = Math.floor(i / groupSize) + 1;
    const startOrd = i + 1;
    const endOrd = Math.min(i + groupSize, items.length);
    groups.push({
      key: `g${groupNum}`,
      label: `단원 ${startOrd}~${endOrd}`,
      items: items.slice(i, i + groupSize),
      colorClass: GROUP_COLORS[(groupNum - 1) % GROUP_COLORS.length],
    });
  }
  return groups;
}
