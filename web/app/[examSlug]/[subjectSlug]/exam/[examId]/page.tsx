import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getExamTypeBySlug, getSubjectBySlug } from "@/lib/exam-types";
import { getCbtExam } from "@/lib/cbt-data";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

interface PageProps {
  params: Promise<{ examSlug: string; subjectSlug: string; examId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { examSlug, subjectSlug, examId } = await params;
  const exam = getExamTypeBySlug(decodeURIComponent(examSlug));
  const subject = getSubjectBySlug(decodeURIComponent(subjectSlug));
  if (!exam || !subject) return { title: "시험 없음" };
  return {
    title: `${exam.shortLabel} ${subject.label} ${examId} 회차 — 기출노트`,
    description: `${exam.label} ${subject.label} ${examId} 회차 기출문제.`,
    alternates: { canonical: `${exam.routes.main}/${subject.slug}/exam/${examId}` },
  };
}

/** 회차 진입 → 1번 문제로 즉시 redirect (한능검 /exam/[examNumber] 동일 패턴). */
export default async function CbtExamRoundPage({ params }: PageProps) {
  const { examSlug, subjectSlug, examId } = await params;
  const exam = getExamTypeBySlug(decodeURIComponent(examSlug));
  const subject = getSubjectBySlug(decodeURIComponent(subjectSlug));
  if (!exam || !subject) notFound();

  const ref =
    exam.subjects.required.find((r) => r.subjectId === subject.id) ??
    exam.subjects.selectable?.find((r) => r.subjectId === subject.id);
  const stem = ref?.stem ?? subject.questionPool?.stem;
  if (!stem) notFound();

  // Verify the round actually exists, then redirect.
  const examData = await getCbtExam(stem, examId);
  if (!examData) notFound();

  // Korean URL segments must be percent-encoded for HTTP Location header.
  const target =
    "/" + encodeURIComponent(exam.slug) +
    "/" + encodeURIComponent(subject.slug) +
    "/exam/" + examId + "/1";
  redirect(target);
}
