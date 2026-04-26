import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getExamTypeBySlug, getSubjectBySlug } from "@/lib/exam-types";
import WrongAnswersPage from "@/app/wrong-answers/page";

// localStorage 기반 (사용자별) → SSG 의미 X. 첫 요청 시 dynamic 렌더.
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ examSlug: string; subjectSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { examSlug, subjectSlug } = await params;
  const exam = getExamTypeBySlug(decodeURIComponent(examSlug));
  const subject = getSubjectBySlug(decodeURIComponent(subjectSlug));
  if (!exam || !subject) return { title: "오답노트" };
  return {
    title: `${exam.shortLabel} ${subject.label} 오답노트 — 기출노트`,
    description: `${exam.label} ${subject.label} 학습 중 자동 수집된 오답.`,
    alternates: { canonical: `${exam.routes.main}/${subject.slug}/wrong-answers` },
    robots: { index: false, follow: true }, // localStorage UI — 색인 X
  };
}

export default async function PerSubjectWrongAnswers({ params }: PageProps) {
  const { examSlug, subjectSlug } = await params;
  const exam = getExamTypeBySlug(decodeURIComponent(examSlug));
  const subject = getSubjectBySlug(decodeURIComponent(subjectSlug));
  if (!exam || !subject) notFound();
  return <WrongAnswersPage />;
}
