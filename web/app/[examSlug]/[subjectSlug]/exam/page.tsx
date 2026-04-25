import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import {
  getAllExamTypes,
  getExamTypeBySlug,
  getSubjectBySlug,
  getSubjectById,
} from "@/lib/exam-types";
import { getCbtManifest } from "@/lib/cbt-data";
import BreadCrumb from "@/components/BreadCrumb";
import RoundList, { type RoundListItem } from "@/components/RoundList";

interface PageProps {
  params: Promise<{ examSlug: string; subjectSlug: string }>;
}

// SSG: pre-generate (examSlug, subjectSlug) pairs for live subjects with a CBT stem
// (either subject.questionPool.stem OR per-exam SubjectRef.stem override)
export function generateStaticParams() {
  const out: Array<{ examSlug: string; subjectSlug: string }> = [];
  for (const exam of getAllExamTypes()) {
    const allRefs = [
      ...exam.subjects.required,
      ...(exam.subjects.selectable ?? []),
    ];
    for (const ref of allRefs) {
      if (ref.status !== "live") continue;
      const subj = getSubjectById(ref.subjectId);
      if (!subj) continue;
      const stem = ref.stem ?? subj.questionPool?.stem;
      if (!stem) continue; // 한능검 같이 R2 stem 없는 과목은 제외 (legacy /exam routes 사용)
      out.push({ examSlug: exam.slug, subjectSlug: subj.slug });
    }
  }
  return out;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { examSlug, subjectSlug } = await params;
  const exam = getExamTypeBySlug(decodeURIComponent(examSlug));
  const subject = getSubjectBySlug(decodeURIComponent(subjectSlug));
  if (!exam || !subject) return { title: "시험 없음" };
  return {
    title: `${exam.shortLabel} ${subject.label} 회차별 기출 — 기출노트`,
    description: `${exam.label} ${subject.label} 기출 회차 목록. 무료 풀이.`,
    alternates: { canonical: `${exam.routes.main}/${subject.slug}/exam` },
  };
}

export default async function CbtRoundListPage({ params }: PageProps) {
  const { examSlug, subjectSlug } = await params;
  const examS = decodeURIComponent(examSlug);
  const subS = decodeURIComponent(subjectSlug);
  const exam = getExamTypeBySlug(examS);
  const subject = getSubjectBySlug(subS);
  if (!exam || !subject) notFound();

  // Find the SubjectRef inside this exam to read per-exam stem override
  const ref =
    exam.subjects.required.find((r) => r.subjectId === subject.id) ??
    exam.subjects.selectable?.find((r) => r.subjectId === subject.id);
  const stem = ref?.stem ?? subject.questionPool?.stem;

  if (!stem || ref?.status !== "live") {
    return (
      <main className="bg-[var(--gc-bg)] min-h-screen">
        <div className="mx-auto max-w-3xl px-5 py-16 text-center">
          <h1 className="font-serif-kr text-3xl font-black mb-4">{subject.label}</h1>
          <p className="text-[var(--gc-ink2)]">콘텐츠 준비중입니다.</p>
          <Link href={exam.routes.main} className="mt-6 inline-block rounded-full bg-[var(--gc-ink)] text-white px-6 py-2 text-sm font-bold">
            {exam.shortLabel}로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  const manifest = await getCbtManifest(stem);

  if (!manifest) {
    return (
      <main className="bg-[var(--gc-bg)] min-h-screen">
        <div className="mx-auto max-w-3xl px-5 py-16 text-center">
          <h1 className="font-serif-kr text-3xl font-black mb-4">{subject.label}</h1>
          <p className="text-[var(--gc-ink2)]">데이터를 불러오지 못했습니다.</p>
        </div>
      </main>
    );
  }

  // Strip the exam-name prefix from each round label
  const prefix = manifest.category.name + " ";
  const stripPrefix = (label: string) => (label.startsWith(prefix) ? label.slice(prefix.length) : label);

  const items: RoundListItem[] = manifest.exams.map((e) => ({
    id: e.exam_id,
    label: stripPrefix(e.label),
    href: `${exam.routes.main}/${subject.slug}/exam/${e.exam_id}`,
    badge: `${e.question_count}문항`,
  }));

  return (
    <div>
      <BreadCrumb
        items={[
          { label: "기출노트", href: "/" },
          { label: exam.label, href: exam.routes.main },
          { label: subject.label },
        ]}
      />

      <h1 className="text-xl font-extrabold text-slate-900 mb-0.5">회차별 기출문제</h1>
      <p className="text-slate-500 text-[13px] mb-5">
        {exam.shortLabel} · {subject.label} · {manifest.category.examCount}개 회차 · {manifest.category.questionCount.toLocaleString()}문항
      </p>

      <RoundList items={items} />
    </div>
  );
}
