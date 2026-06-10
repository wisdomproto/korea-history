import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getExamTypeBySlug, getSubjectBySlug } from "@/lib/exam-types";
import { getCbtExam } from "@/lib/cbt-data";
import {
  isHistorySubject,
  HISTORY_ROUTES,
  historyUnifiedMeta,
} from "@/lib/korean-history-redirect";

// ISR: 회차 진입(→1번 문제 redirect)을 URL별 캐시. force-dynamic 제거로 봇 반복 크롤 시 재실행 방지.
export const revalidate = 86400;

interface PageProps {
  params: Promise<{ examSlug: string; subjectSlug: string; examId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { examSlug, subjectSlug, examId } = await params;
  const exam = getExamTypeBySlug(decodeURIComponent(examSlug));
  const subject = getSubjectBySlug(decodeURIComponent(subjectSlug));
  if (!exam || !subject) return { title: "시험 없음" };
  if (isHistorySubject(subject.id) && exam.id !== "korean-history") {
    return historyUnifiedMeta(exam.label);
  }
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

  // 한국사 통합: 한능검 회차 목록으로 redirect (개별 회차 ID는 매핑 불가, 학습 시작점으로 이동)
  if (isHistorySubject(subject.id) && exam.id !== "korean-history") {
    redirect(HISTORY_ROUTES.exam);
  }

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
