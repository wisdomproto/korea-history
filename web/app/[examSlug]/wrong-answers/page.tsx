import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  getAllExamTypes,
  getExamTypeBySlug,
  getSubjectById,
  type ExamType,
  type Subject,
} from "@/lib/exam-types";
import ExamWrongSummary from "./ExamWrongSummary";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ examSlug: string }>;
}

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { examSlug } = await params;
  const exam = getExamTypeBySlug(decodeURIComponent(examSlug));
  if (!exam) return { title: "오답노트" };
  return {
    title: `${exam.shortLabel} 오답노트 — 기출노트`,
    description: `${exam.label} 학습 중 자동 수집된 오답 (과목별 요약).`,
    alternates: { canonical: `${exam.routes.main}/wrong-answers` },
  };
}

export default async function ExamWrongAnswers({ params }: PageProps) {
  const { examSlug } = await params;
  const slug = decodeURIComponent(examSlug);
  const exam = getExamTypeBySlug(slug);
  if (!exam) notFound();

  // live 과목들만 추출
  const liveSubjects: Subject[] = [
    ...exam.subjects.required,
    ...(exam.subjects.selectable ?? []),
  ]
    .filter((r) => r.status === "live")
    .map((r) => getSubjectById(r.subjectId))
    .filter((s): s is Subject => !!s);

  // 단일 과목 → 그 과목 디테일로 즉시 redirect
  if (liveSubjects.length === 1) {
    const target =
      "/" + encodeURIComponent(exam.slug) +
      "/" + encodeURIComponent(liveSubjects[0].slug) +
      "/wrong-answers";
    redirect(target);
  }

  // 다중 과목 → 과목별 오답 요약 (client component)
  return (
    <ExamWrongSummary
      exam={examToPlain(exam)}
      subjects={liveSubjects.map((s) => ({
        id: s.id,
        slug: s.slug,
        label: s.label,
        shortLabel: s.shortLabel,
      }))}
    />
  );
}

function examToPlain(exam: ExamType) {
  return {
    id: exam.id,
    slug: exam.slug,
    label: exam.label,
    shortLabel: exam.shortLabel,
    routesMain: exam.routes.main,
  };
}
