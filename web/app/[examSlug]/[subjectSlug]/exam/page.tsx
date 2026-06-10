import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Metadata } from "next";
import {
  getExamTypeBySlug,
  getSubjectBySlug,
} from "@/lib/exam-types";
import { getCbtManifest } from "@/lib/cbt-data";
import BreadCrumb from "@/components/BreadCrumb";
import RoundList, { type RoundListItem } from "@/components/RoundList";
import { civilExamListMeta } from "@/lib/civil-seo";
import { getNoteForSubjectLabel } from "@/lib/civil-notes";
import {
  isHistorySubject,
  HISTORY_ROUTES,
  historyUnifiedMeta,
} from "@/lib/korean-history-redirect";

interface PageProps {
  params: Promise<{ examSlug: string; subjectSlug: string }>;
}

// 회차 목록은 R2 fetch — SSG 1098개는 Vercel ENOSPC 일으킴.
// ISR: generateStaticParams=[] + revalidate 로 첫 요청만 SSR, 이후 CDN 캐시.
// (force-dynamic은 캐시를 꺼서 봇 크롤마다 함수 재실행시킴 → 제거)
export const revalidate = 86400;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { examSlug, subjectSlug } = await params;
  const exam = getExamTypeBySlug(decodeURIComponent(examSlug));
  const subject = getSubjectBySlug(decodeURIComponent(subjectSlug));
  if (!exam || !subject) return { title: "시험 없음" };
  if (isHistorySubject(subject.id) && exam.id !== "korean-history") {
    return historyUnifiedMeta(exam.label);
  }
  const meta = civilExamListMeta(exam, subject);
  // 수동 노트 과목만 색인. 자동 과목의 회차 목록은 thin scaffold라 noindex,follow.
  if (!getNoteForSubjectLabel(subject.label)) {
    meta.robots = { index: false, follow: true };
  }
  return meta;
}

export default async function CbtRoundListPage({ params }: PageProps) {
  const { examSlug, subjectSlug } = await params;
  const examS = decodeURIComponent(examSlug);
  const subS = decodeURIComponent(subjectSlug);
  const exam = getExamTypeBySlug(examS);
  const subject = getSubjectBySlug(subS);
  if (!exam || !subject) notFound();

  // 한국사 통합: 한능검 회차 목록으로 redirect
  if (isHistorySubject(subject.id) && exam.id !== "korean-history") {
    redirect(HISTORY_ROUTES.exam);
  }

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
