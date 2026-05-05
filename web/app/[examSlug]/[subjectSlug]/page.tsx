import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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
import {
  getNoteForSubjectLabel,
  getCivilNote,
  getNoteTopicsIndex,
} from "@/lib/civil-notes";
import {
  getAutoMeta,
  getAutoTopics,
  getAutoQuestionsForTopic,
} from "@/lib/civil-notes-auto";

interface PageProps {
  params: Promise<{ examSlug: string; subjectSlug: string }>;
}

// dynamicParams: true (default) — featured ExamType만 prerender, 나머지는 첫 요청 시 SSR + cache
export const revalidate = 3600;

export function generateStaticParams() {
  const out: Array<{ examSlug: string; subjectSlug: string }> = [];
  for (const exam of getAllExamTypes()) {
    // featured/highlight ExamType만 prerender (1098 → ~100 정도로 축소, ENOSPC 회피)
    if (!exam.featured && !exam.highlight) continue;
    const refs = [...exam.subjects.required, ...(exam.subjects.selectable ?? [])];
    for (const ref of refs) {
      if (ref.status !== "live") continue;
      const subj = getSubjectById(ref.subjectId);
      if (!subj) continue;
      out.push({ examSlug: exam.slug, subjectSlug: subj.slug });
    }
  }
  return out;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { examSlug, subjectSlug } = await params;
  const exam = getExamTypeBySlug(decodeURIComponent(examSlug));
  const subject = getSubjectBySlug(decodeURIComponent(subjectSlug));
  if (!exam || !subject) return { title: "시험" };
  return {
    title: `${exam.shortLabel} ${subject.label} — 기출노트`,
    description: `${exam.label} ${subject.label} 기출문제 / 오답노트 / 내 기록.`,
    alternates: { canonical: `${exam.routes.main}/${subject.slug}` },
  };
}

/**
 * 시험-과목 단독 랜딩 — 한능검처럼 단순한 leaf 페이지.
 * Hero + 회차 빠른 진입 (있으면) + 4개 CTA (기출/노트/오답/기록).
 */
export default async function SubjectLanding({ params }: PageProps) {
  const { examSlug, subjectSlug } = await params;
  const examS = decodeURIComponent(examSlug);
  const subS = decodeURIComponent(subjectSlug);
  const exam = getExamTypeBySlug(examS);
  const subject = getSubjectBySlug(subS);
  if (!exam || !subject) notFound();

  const ref =
    exam.subjects.required.find((r) => r.subjectId === subject.id) ??
    exam.subjects.selectable?.find((r) => r.subjectId === subject.id);

  // 한능검 한국사 — legacy 한능검 풍부한 랜딩으로 redirect (URL encode 필수)
  if (exam.id === "korean-history" && subject.id === "korean-history") {
    redirect("/" + encodeURIComponent("한능검"));
  }

  // CBT stem — 회차 미리보기 가능
  const stem = ref?.stem ?? subject.questionPool?.stem;
  const manifest = stem ? await getCbtManifest(stem) : null;
  const previewRounds = manifest?.exams.slice(0, 6) ?? [];

  // 단권화 노트 매칭 (9급 13개 과목 — 수동 본문)
  const civilNoteMeta = getNoteForSubjectLabel(subject.label);
  const civilNote = civilNoteMeta ? getCivilNote(civilNoteMeta.slug) : null;
  const civilTopics = civilNoteMeta ? getNoteTopicsIndex(civilNoteMeta.slug) : [];

  // 자동 가이드 (730 stem 자동 분류, 수동 노트 없을 때 fallback)
  const autoMeta = !civilNote ? await getAutoMeta(stem) : null;
  const autoTopics = autoMeta ? await getAutoTopics(stem) : [];

  const hasNotes =
    (subject.id === "korean-history" && subject.notePool) ||
    Boolean(civilNote) ||
    Boolean(autoMeta && autoTopics.length > 0);
  const baseUrl = `${exam.routes.main}/${subject.slug}`;

  // RoundList items
  const roundItems: RoundListItem[] =
    manifest && previewRounds.length > 0
      ? previewRounds.map((r) => ({
          id: r.exam_id,
          label: r.label.replace(manifest.category.name + " ", ""),
          href: `${baseUrl}/exam/${r.exam_id}`,
          badge: `${r.question_count}문항`,
        }))
      : [];

  return (
    <div>
      <BreadCrumb
        items={[
          { label: "기출노트", href: "/" },
          { label: exam.label, href: exam.routes.main },
          { label: subject.label },
        ]}
      />

      {/* Hero */}
      <header className="mb-8">
        <div className="font-mono text-xs uppercase tracking-wider text-[var(--gc-amber)] mb-2">
          {exam.icon} {exam.shortLabel}
        </div>
        <h1 className="font-serif-kr text-3xl md:text-5xl font-black text-[var(--gc-ink)]">
          {subject.label}
        </h1>
        {subject.description && (
          <p className="mt-3 text-sm md:text-base text-[var(--gc-ink2)] max-w-2xl">
            {subject.description}
          </p>
        )}
        {manifest && (
          <p className="mt-2 text-xs text-[var(--gc-ink2)]">
            {manifest.category.examCount}회차 · {manifest.category.questionCount.toLocaleString()}문항
          </p>
        )}
      </header>

      {/* CTA grid */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 mb-10">
        <CtaCard
          href={`${baseUrl}/exam`}
          label="기출 풀기"
          icon="📝"
          available={!!stem}
          primary
        />
        <CtaCard
          href={`${baseUrl}/notes`}
          label={civilNote ? "요약노트" : autoMeta ? "학습가이드" : "요약노트"}
          icon="📚"
          available={!!hasNotes}
          unavailableLabel="준비중"
        />
        <CtaCard href={`${baseUrl}/wrong-answers`} label="오답노트" icon="✗" available />
        <CtaCard href={`${baseUrl}/my-record`} label="내 기록" icon="📊" available />
      </div>

      {/* 회차 미리보기 */}
      {roundItems.length > 0 && (
        <>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-700">최근 회차</h2>
            <Link
              href={`${baseUrl}/exam`}
              className="text-xs font-bold text-[var(--gc-amber)] hover:underline"
            >
              전체 회차 →
            </Link>
          </div>
          <RoundList items={roundItems} />
        </>
      )}

      {/* 단권화 미리보기 카드 (본문 X — "요약노트" CTA 클릭하면 전체 보기) */}
      {(civilNote || autoMeta) && (
        <section className="mt-12">
          <div className="rounded-2xl border border-[var(--gc-hairline)] bg-white p-5">
            <div className="flex items-start gap-3 flex-wrap">
              <div className="text-3xl">📚</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <h2 className="font-serif-kr text-lg font-bold text-[var(--gc-ink)]">
                    {civilNote ? "단권화 요약노트 LIVE" : "자동 학습 가이드"}
                  </h2>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--gc-amber)] font-bold">
                    {civilNote ? `${civilTopics.length}단원 · 본문` : `${autoTopics.length}단원 · 자동 분류`}
                  </span>
                </div>
                <p className="text-xs text-[var(--gc-ink2)] mt-1">
                  {civilNote
                    ? `${civilNoteMeta!.subtitle}`
                    : `이 시험 ${autoMeta!.totalQ}문제 자동 분석한 빈출 주제`}
                </p>
              </div>
              <Link
                href={`${baseUrl}/notes`}
                className="rounded-full bg-[var(--gc-amber)] text-white px-4 py-2 text-xs font-bold hover:opacity-90 whitespace-nowrap"
              >
                요약노트 열기 →
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function CtaCard({
  href,
  label,
  icon,
  available,
  primary,
  unavailableLabel = "준비중",
}: {
  href: string;
  label: string;
  icon: string;
  available: boolean;
  primary?: boolean;
  unavailableLabel?: string;
}) {
  if (!available) {
    return (
      <div
        className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-4 text-center text-slate-400"
        title="준비중"
      >
        <div className="text-2xl mb-1">{icon}</div>
        <div className="text-sm font-bold">{label}</div>
        <div className="text-[10px] mt-1 font-mono uppercase">{unavailableLabel}</div>
      </div>
    );
  }
  return (
    <Link
      href={href}
      className={`rounded-2xl border p-4 text-center transition-all hover:scale-[1.02] ${
        primary
          ? "border-[var(--gc-amber)] bg-[var(--gc-ink)] text-white"
          : "border-slate-200 bg-white text-slate-900 hover:border-[var(--gc-amber)]"
      }`}
    >
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-sm font-bold">{label}</div>
    </Link>
  );
}
