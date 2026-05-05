import Link from "next/link";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getExamTypeBySlug, getSubjectBySlug } from "@/lib/exam-types";
import { getNotesIndex, getNotesGroupedBySection } from "@/lib/notes";
import NotesHome from "@/app/notes/NotesHome";
import {
  getNoteForSubjectLabel,
  getNoteTopicsIndex,
  getQuestionsForTopic,
} from "@/lib/civil-notes";
import {
  getAutoMeta,
  getAutoTopics,
  getAutoQuestionsForTopic,
} from "@/lib/civil-notes-auto";
import CivilNotesHome from "./CivilNotesHome";

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
  const ref =
    exam.subjects.required.find((r) => r.subjectId === subject.id) ??
    exam.subjects.selectable?.find((r) => r.subjectId === subject.id);
  const stem = ref?.stem ?? subject.questionPool?.stem;
  const autoMeta = !civilNote && stem ? await getAutoMeta(stem) : null;
  const hasContent = subject.id === "korean-history" || Boolean(civilNote) || Boolean(autoMeta);

  return {
    title: `${exam.shortLabel} ${subject.label} 요약노트 — 기출노트`,
    description: civilNote
      ? `${exam.label} ${subject.label} 자동 단권화. 빈출 주제 100% 커버.`
      : `${exam.label} ${subject.label} 단원별 요약노트.`,
    alternates: { canonical: `${exam.routes.main}/${subject.slug}/notes` },
    ...(hasContent ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function PerSubjectNotes({ params }: PageProps) {
  const { examSlug, subjectSlug } = await params;
  const exam = getExamTypeBySlug(decodeURIComponent(examSlug));
  const subject = getSubjectBySlug(decodeURIComponent(subjectSlug));
  if (!exam || !subject) notFound();

  // 한능검 한국사만 노트 LIVE — legacy NotesHome 재사용
  if (subject.id === "korean-history" && subject.notePool) {
    const notes = getNotesIndex();
    const grouped = getNotesGroupedBySection();
    return <NotesHome notes={notes} grouped={grouped} />;
  }

  // 9급/자격증 본문 단권화 매칭
  const civilNoteMeta = getNoteForSubjectLabel(subject.label);
  if (civilNoteMeta) {
    const topics = getNoteTopicsIndex(civilNoteMeta.slug);
    const topicsWithQuestions = topics.map((t) => ({
      ...t,
      questionCount: getQuestionsForTopic(civilNoteMeta.slug, t.topicId, 100).length,
    }));
    return (
      <CivilNotesHome
        examLabel={exam.shortLabel}
        examMain={exam.routes.main}
        subjectLabel={subject.label}
        subjectSlug={subject.slug}
        noteSlug={civilNoteMeta.slug}
        topics={topicsWithQuestions}
        mode="manual"
        meta={{
          totalTopics: topics.length,
          chars: civilNoteMeta.chars,
          subtitle: civilNoteMeta.subtitle,
        }}
      />
    );
  }

  // 자동 가이드 (730 stem 자동 분류)
  const ref =
    exam.subjects.required.find((r) => r.subjectId === subject.id) ??
    exam.subjects.selectable?.find((r) => r.subjectId === subject.id);
  const stem = ref?.stem ?? subject.questionPool?.stem;
  const autoMeta = stem ? await getAutoMeta(stem) : null;
  if (autoMeta && stem) {
    const autoTopics = await getAutoTopics(stem);
    const topicsWithQuestions = await Promise.all(
      autoTopics.map(async (t) => ({
        topicId: t.topicId,
        ord: t.ord,
        title: t.title,
        keywords: t.keywords,
        freq: t.freq,
        chars: 0,
        questionCount: (await getAutoQuestionsForTopic(stem, t.topicId, 100)).length,
      })),
    );
    return (
      <CivilNotesHome
        examLabel={exam.shortLabel}
        examMain={exam.routes.main}
        subjectLabel={subject.label}
        subjectSlug={subject.slug}
        noteSlug={null}
        topics={topicsWithQuestions}
        mode="auto"
        stem={stem}
        meta={{
          totalTopics: autoTopics.length,
          totalQ: autoMeta.totalQ,
          subtitle: `자동 분류 · ${autoMeta.totalQ}문제 인덱스`,
        }}
      />
    );
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
