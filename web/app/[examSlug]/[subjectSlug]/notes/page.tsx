import Link from "next/link";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getExamTypeBySlug, getSubjectBySlug } from "@/lib/exam-types";
import { getNotesIndex, getNotesGroupedBySection } from "@/lib/notes";
import NotesHome from "@/app/notes/NotesHome";

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
  // 한국사만 콘텐츠 LIVE (한능검 87노트 reuse), 그 외엔 placeholder → noindex
  const hasContent = subject.id === "korean-history";
  return {
    title: `${exam.shortLabel} ${subject.label} 요약노트 — 기출노트`,
    description: `${exam.label} ${subject.label} 시대별/주제별 요약노트.`,
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

  // 다른 과목 — placeholder
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
