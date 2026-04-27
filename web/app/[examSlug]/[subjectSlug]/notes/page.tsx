import Link from "next/link";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getExamTypeBySlug, getSubjectBySlug } from "@/lib/exam-types";
import { getNotesIndex, getNotesGroupedBySection } from "@/lib/notes";
import NotesHome from "@/app/notes/NotesHome";
import {
  getNoteForSubjectLabel,
  getCivilNote,
  getNoteTopicsIndex,
} from "@/lib/civil-notes";

// 한국사 외엔 placeholder — prerender 안 함. 첫 요청 시 dynamic.
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ examSlug: string; subjectSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { examSlug, subjectSlug } = await params;
  const exam = getExamTypeBySlug(decodeURIComponent(examSlug));
  const subject = getSubjectBySlug(decodeURIComponent(subjectSlug));
  if (!exam || !subject) return { title: "요약노트" };

  const civilNote = getNoteForSubjectLabel(subject.label);
  const hasContent = subject.id === "korean-history" || Boolean(civilNote);

  return {
    title: `${exam.shortLabel} ${subject.label} 요약노트 — 기출노트`,
    description: civilNote
      ? `${exam.label} ${subject.label} 자동 단권화. ${civilNote.topics}단원 / 빈출 주제 100% 커버.`
      : `${exam.label} ${subject.label} 시대별/주제별 요약노트.`,
    alternates: { canonical: `${exam.routes.main}/${subject.slug}/notes` },
    ...(hasContent ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function PerSubjectNotes({ params }: PageProps) {
  const { examSlug, subjectSlug } = await params;
  const exam = getExamTypeBySlug(decodeURIComponent(examSlug));
  const subject = getSubjectBySlug(decodeURIComponent(subjectSlug));
  if (!exam || !subject) notFound();

  // 한국사 subject만 노트 LIVE — 한능검 콘텐츠 재사용
  if (subject.id === "korean-history" && subject.notePool) {
    const notes = getNotesIndex();
    const grouped = getNotesGroupedBySection();
    return <NotesHome notes={notes} grouped={grouped} />;
  }

  // 9급 공무원 자동 단권화 매칭 — Subject label로 찾기
  const civilNoteMeta = getNoteForSubjectLabel(subject.label);
  if (civilNoteMeta) {
    const note = getCivilNote(civilNoteMeta.slug);
    const topics = getNoteTopicsIndex(civilNoteMeta.slug);
    if (note) {
      return (
        <>
          {/* 단권화 노트 자체 스타일 (cream/amber 디자인 시스템) */}
          <style dangerouslySetInnerHTML={{ __html: note.style }} />

          <main style={{ background: "var(--gc-bg, #F5EFE4)", minHeight: "calc(100vh - 68px)" }}>
            <div className="mx-auto max-w-[1080px] px-6 pt-8 pb-16">
              {/* Breadcrumbs */}
              <nav
                style={{
                  fontSize: 12,
                  color: "var(--gc-subtle, #5A4F3F)",
                  marginBottom: 20,
                  fontFamily: "var(--gc-font-mono, monospace)",
                }}
              >
                <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>홈</Link>
                <span style={{ margin: "0 8px" }}>›</span>
                <Link href={exam.routes.main} style={{ color: "inherit", textDecoration: "none" }}>
                  {exam.shortLabel}
                </Link>
                <span style={{ margin: "0 8px" }}>›</span>
                <span style={{ color: "var(--gc-amber, #B45309)", fontWeight: 700 }}>
                  {subject.label} 단권화
                </span>
              </nav>

              {/* Hero */}
              <header
                style={{
                  background: "#fff",
                  border: "1px solid rgba(31,26,20,.12)",
                  borderRadius: 14,
                  padding: "24px 28px",
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--gc-font-mono, monospace)",
                    fontSize: 11,
                    letterSpacing: "0.18em",
                    color: "#B45309",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  Auto Summary Note · {exam.shortLabel}
                </div>
                <h1
                  className="font-serif-kr"
                  style={{
                    fontSize: "clamp(28px, 4vw, 38px)",
                    fontWeight: 900,
                    lineHeight: 1.1,
                    margin: 0,
                    color: "#1F1A14",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {subject.label} <span style={{ color: "#B45309" }}>자동 단권화</span>
                </h1>
                <p style={{ fontSize: 14, color: "#5A4F3F", margin: "10px 0 0", lineHeight: 1.6 }}>
                  {note.subtitle} · 200문제 시드 + 빈출 주제 100% 커버
                </p>
                <div
                  style={{
                    marginTop: 16,
                    display: "flex",
                    gap: 14,
                    flexWrap: "wrap",
                    fontFamily: "var(--gc-font-mono, monospace)",
                    fontSize: 11,
                    color: "#5A4F3F",
                  }}
                >
                  <span>📋 {topics.length}단원</span>
                  <span>·</span>
                  <span>🔑 {civilNoteMeta.keywords}키워드</span>
                  <span>·</span>
                  <span>📝 약 {Math.round(civilNoteMeta.chars / 100) * 100}자</span>
                </div>
              </header>

              {/* 단원 빠른 이동 */}
              <section
                style={{
                  background: "#fff",
                  border: "1px solid rgba(31,26,20,.12)",
                  borderRadius: 14,
                  padding: "20px 28px",
                  marginBottom: 20,
                }}
              >
                <h2
                  className="font-serif-kr"
                  style={{ fontSize: 18, fontWeight: 800, margin: "0 0 12px", color: "#1F1A14" }}
                >
                  📚 단원별 바로가기 ({topics.length})
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
                  {topics.map((t) => (
                    <li key={t.topicId}>
                      <Link
                        href={`/civil-notes/${civilNoteMeta.slug}/${t.topicId}`}
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
                        <span
                          style={{
                            color: "#94724D",
                            marginRight: 6,
                            fontFamily: "var(--gc-font-mono, monospace)",
                            fontSize: 11,
                          }}
                        >
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

              {/* 본문 — 원본 HTML */}
              <article
                style={{
                  background: "transparent",
                  borderRadius: 14,
                }}
                dangerouslySetInnerHTML={{ __html: note.body }}
              />

              {/* CTA */}
              <section
                style={{
                  margin: "32px 0",
                  padding: "20px 28px",
                  background: "#fff",
                  border: "1px solid rgba(31,26,20,.12)",
                  borderRadius: 14,
                  textAlign: "center",
                }}
              >
                <p style={{ margin: "0 0 14px", fontSize: 14, color: "#5A4F3F" }}>
                  {subject.label} 기출문제도 풀면서 단권화 + 학습
                </p>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                  <Link
                    href={`${exam.routes.main}/${subject.slug}/exam`}
                    style={{
                      display: "inline-block",
                      padding: "10px 20px",
                      background: "#1F1A14",
                      color: "#fff",
                      borderRadius: 8,
                      textDecoration: "none",
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {subject.label} 기출 풀기
                  </Link>
                  <Link
                    href="/civil-notes"
                    style={{
                      display: "inline-block",
                      padding: "10px 20px",
                      background: "#fff",
                      color: "#B45309",
                      borderRadius: 8,
                      textDecoration: "none",
                      fontSize: 13,
                      fontWeight: 700,
                      border: "1px solid #B45309",
                    }}
                  >
                    13개 과목 단권화 전체보기
                  </Link>
                </div>
              </section>
            </div>
          </main>

          <style>{`
            .topic-link:hover {
              background: #FFF7ED;
              color: #B45309 !important;
            }
          `}</style>
        </>
      );
    }
  }

  // 매칭 안 됨 — 기존 placeholder
  return (
    <main className="bg-[var(--gc-bg)] min-h-screen">
      <div className="mx-auto max-w-3xl px-5 py-16 text-center">
        <h1 className="font-serif-kr text-3xl md:text-4xl font-black mb-4 text-[var(--gc-ink)]">
          {subject.label} 요약노트
        </h1>
        <p className="text-[var(--gc-ink2)] mb-2">
          이 과목의 요약노트는 <strong>준비중</strong>입니다.
        </p>
        <p className="text-sm text-[var(--gc-ink2)] mb-8">
          기출문제 + 오답노트 학습은 지금 가능합니다. 노트는 단계적으로 추가됩니다.
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          <Link
            href={`${exam.routes.main}/${subject.slug}/exam`}
            className="rounded-full bg-[var(--gc-ink)] text-white px-5 py-2 text-sm font-bold hover:bg-[var(--gc-amber)]"
          >
            {subject.label} 기출 풀기
          </Link>
          <Link
            href={exam.routes.main}
            className="rounded-full border border-[var(--gc-hairline)] bg-white px-5 py-2 text-sm font-bold text-[var(--gc-ink)]"
          >
            {exam.shortLabel} 메인
          </Link>
        </div>
      </div>
    </main>
  );
}
