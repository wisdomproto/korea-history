import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getExamTypeBySlug, getSubjectBySlug } from "@/lib/exam-types";
import MyRecord from "@/app/my-record/MyRecord";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ examSlug: string; subjectSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { examSlug, subjectSlug } = await params;
  const exam = getExamTypeBySlug(decodeURIComponent(examSlug));
  const subject = getSubjectBySlug(decodeURIComponent(subjectSlug));
  if (!exam || !subject) return { title: "내 기록" };
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
  return <MyRecord />;
}
