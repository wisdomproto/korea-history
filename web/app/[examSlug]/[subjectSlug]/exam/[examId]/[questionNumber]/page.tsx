import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getExamTypeBySlug, getSubjectBySlug } from "@/lib/exam-types";
import { getCbtExam, getCbtManifest } from "@/lib/cbt-data";
import { adaptCbtQuestion, adaptCbtExamMeta } from "@/lib/cbt-adapter";
import QuestionWithTracking from "@/components/QuestionWithTracking";
import BreadCrumb from "@/components/BreadCrumb";
import {
  getRelatedTopicsForQuestion,
  getRelatedTopicsForQuestionFromIndex,
} from "@/lib/civil-notes";
import { getAutoRelatedTopicsForQuestion, getAutoMeta } from "@/lib/civil-notes-auto";

// 잠재 prerender 폭발 (수만개) 방지 — 첫 요청 SSR + ISR cache
export const dynamic = "force-dynamic";
export const revalidate = 3600;

interface PageProps {
  params: Promise<{
    examSlug: string;
    subjectSlug: string;
    examId: string;
    questionNumber: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { examSlug, subjectSlug, examId, questionNumber } = await params;
  const exam = getExamTypeBySlug(decodeURIComponent(examSlug));
  const subject = getSubjectBySlug(decodeURIComponent(subjectSlug));
  if (!exam || !subject) return { title: "문제 없음" };
  return {
    title: `${exam.shortLabel} ${subject.label} ${examId} ${questionNumber}번 — 기출노트`,
    description: `${exam.label} ${subject.label} 기출 ${examId} ${questionNumber}번 문제 풀이.`,
    alternates: {
      canonical: `${exam.routes.main}/${subject.slug}/exam/${examId}/${questionNumber}`,
    },
  };
}

export default async function CbtQuestionPage({ params }: PageProps) {
  const { examSlug, subjectSlug, examId, questionNumber } = await params;
  const exam = getExamTypeBySlug(decodeURIComponent(examSlug));
  const subject = getSubjectBySlug(decodeURIComponent(subjectSlug));
  if (!exam || !subject) notFound();

  const ref =
    exam.subjects.required.find((r) => r.subjectId === subject.id) ??
    exam.subjects.selectable?.find((r) => r.subjectId === subject.id);
  const stem = ref?.stem ?? subject.questionPool?.stem;
  if (!stem) notFound();

  const [manifest, examData] = await Promise.all([
    getCbtManifest(stem),
    getCbtExam(stem, examId),
  ]);
  if (!examData) notFound();

  const qNum = parseInt(questionNumber, 10);
  const cbtQ = examData.questions.find((q) => q.number === qNum);
  if (!cbtQ) notFound();

  const meta = manifest?.exams.find((e) => e.exam_id === examId);
  const adaptedExam = meta ? adaptCbtExamMeta(meta) : adaptCbtExamMeta({
    exam_id: examData.exam_id,
    label: examData.label,
    date: examData.date,
    question_count: examData.question_count,
  });
  const question = adaptCbtQuestion(cbtQ, adaptedExam.id);

  // 9급 단권화 단원 자동 매칭 — 사전 인덱스 우선, 없으면 동적 매칭 fallback
  let relatedNotes = getRelatedTopicsForQuestionFromIndex(
    subject.label,
    examId,
    qNum,
  );
  if (relatedNotes.length === 0) {
    relatedNotes = getRelatedTopicsForQuestion(
      subject.label,
      cbtQ.text || "",
      (cbtQ.choices || []).map((c) => c.text || "").join(" "),
      3,
    );
  }

  // 자동 가이드 매칭 (수동 노트 없을 때, 730 stem 자동 분류)
  if (relatedNotes.length === 0 && stem) {
    const autoMatched = getAutoRelatedTopicsForQuestion(stem, examId, qNum);
    if (autoMatched.length > 0) {
      const autoMeta = getAutoMeta(stem);
      relatedNotes = autoMatched.map((m) => ({
        id: `auto-${stem}-${m.topicId}`,
        title: m.title,
        eraLabel: `${subject.label}${m.freq > 0 ? ` · 출제 ${m.freq}회` : ""}${m.isFallback ? " · 빈출 추천" : ""}`,
        sectionId: m.topicId,
        // 자동 가이드는 별도 페이지 X — subject landing의 단원 섹션으로
        href: `${exam.routes.main}/${subject.slug}#topic-${m.topicId}`,
      }));
    }
  }

  const total = examData.question_count;
  const prev = qNum > 1 ? qNum - 1 : null;
  const next = qNum < total ? qNum + 1 : null;

  const baseUrl = `${exam.routes.main}/${subject.slug}/exam/${examId}`;

  return (
    <main className="bg-[var(--gc-bg)] min-h-screen">
      <div className="mx-auto max-w-3xl px-5 sm:px-6 md:px-8 py-6 md:py-10">
        <BreadCrumb
          items={[
            { label: "기출노트", href: "/" },
            { label: exam.label, href: exam.routes.main },
            { label: subject.label, href: `${exam.routes.main}/${subject.slug}/exam` },
            { label: meta?.label ?? examId, href: baseUrl },
            { label: `${qNum}번` },
          ]}
        />

        <div className="mt-4 mb-6 flex items-baseline justify-between">
          <h1 className="font-serif-kr text-xl md:text-2xl font-bold text-[var(--gc-ink)]">
            {qNum} / {total}
          </h1>
          <Link
            href={baseUrl}
            className="text-xs font-bold text-[var(--gc-amber)] hover:underline"
          >
            전체 회차 →
          </Link>
        </div>

        <QuestionWithTracking
          question={question}
          exam={adaptedExam}
          relatedNotes={relatedNotes.length > 0 ? relatedNotes : undefined}
        />

        <nav className="mt-8 flex items-center justify-between gap-2">
          {prev ? (
            <Link
              href={`${baseUrl}/${prev}`}
              className="rounded-full border border-[var(--gc-hairline)] bg-white px-4 py-2 text-sm font-bold text-[var(--gc-ink)] hover:border-[var(--gc-amber)]"
            >
              ← {prev}번
            </Link>
          ) : (
            <span />
          )}
          <Link
            href={baseUrl}
            className="rounded-full bg-[var(--gc-ink)] text-white px-4 py-2 text-sm font-bold"
          >
            문제 목록
          </Link>
          {next ? (
            <Link
              href={`${baseUrl}/${next}`}
              className="rounded-full bg-[var(--gc-amber)] text-white px-4 py-2 text-sm font-bold hover:opacity-90"
            >
              {next}번 →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </div>
    </main>
  );
}
