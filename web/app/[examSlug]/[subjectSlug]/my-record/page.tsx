import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getExamTypeBySlug, getSubjectBySlug } from "@/lib/exam-types";
import MyRecord from "@/app/my-record/MyRecord";
import {
  isHistorySubject,
  HISTORY_ROUTES,
  historyUnifiedMeta,
} from "@/lib/korean-history-redirect";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ examSlug: string; subjectSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { examSlug, subjectSlug } = await params;
  const exam = getExamTypeBySlug(decodeURIComponent(examSlug));
  const subject = getSubjectBySlug(decodeURIComponent(subjectSlug));
  if (!exam || !subject) return { title: "내 기록" };
  if (isHistorySubject(subject.id) && exam.id !== "korean-history") {
    return historyUnifiedMeta(exam.label);
  }
  return {
    title: `${exam.shortLabel} ${subject.label} 내 기록 — 기출노트`,
    description: `${exam.label} ${subject.label} 풀이 기록과 약점 분석.`,
    alternates: { canonical: `${exam.routes.main}/${subject.slug}/my-record` },
    robots: { index: false, follow: true }, // localStorage UI — 색인 X
  };
}

export default async function PerSubjectMyRecord({ params }: PageProps) {
  const { examSlug, subjectSlug } = await params;
  const exam = getExamTypeBySlug(decodeURIComponent(examSlug));
  const subject = getSubjectBySlug(decodeURIComponent(subjectSlug));
  if (!exam || !subject) notFound();
  if (isHistorySubject(subject.id) && exam.id !== "korean-history") {
    redirect(HISTORY_ROUTES.myRecord);
  }
  return <MyRecord />;
}
