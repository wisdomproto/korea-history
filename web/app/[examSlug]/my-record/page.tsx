import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  getAllExamTypes,
  getExamTypeBySlug,
  getSubjectById,
  type ExamType,
  type Subject,
} from "@/lib/exam-types";
import ExamRecordSummary from "./ExamRecordSummary";

interface PageProps {
  params: Promise<{ examSlug: string }>;
}

export function generateStaticParams() {
  return getAllExamTypes().map((e) => ({ examSlug: e.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { examSlug } = await params;
  const exam = getExamTypeBySlug(decodeURIComponent(examSlug));
  if (!exam) return { title: "내 기록" };
  return {
    title: `${exam.shortLabel} 내 기록 — 기출노트`,
    description: `${exam.label} 학습 기록 (과목별 점수 / 약점 분석).`,
    alternates: { canonical: `${exam.routes.main}/my-record` },
  };
}

export default async function ExamMyRecord({ params }: PageProps) {
  const { examSlug } = await params;
  const slug = decodeURIComponent(examSlug);
  const exam = getExamTypeBySlug(slug);
  if (!exam) notFound();

  const liveSubjects: Subject[] = [
    ...exam.subjects.required,
    ...(exam.subjects.selectable ?? []),
  ]
    .filter((r) => r.status === "live")
    .map((r) => getSubjectById(r.subjectId))
    .filter((s): s is Subject => !!s);

  if (liveSubjects.length === 1) {
    const target =
      "/" + encodeURIComponent(exam.slug) +
      "/" + encodeURIComponent(liveSubjects[0].slug) +
      "/my-record";
    redirect(target);
  }

  return (
    <ExamRecordSummary
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
