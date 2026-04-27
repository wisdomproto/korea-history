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
  const autoMeta = !civilNote ? getAutoMeta(stem) : null;
  const autoTopics = autoMeta ? getAutoTopics(stem) : [];

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

      {/* 자동 학습 가이드 (수동 노트 없을 때, 자동 분류 단원) */}
      {!civilNote && autoMeta && autoTopics.length > 0 && (
        <section className="mt-12">
          <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
            <h2 className="font-serif-kr text-2xl font-black text-[var(--gc-ink)]">
              📚 자동 학습 가이드 — {autoTopics.length}단원
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--gc-amber)] font-bold bg-[#FFF7ED] px-2.5 py-1 rounded-full">
              AUTO · {autoMeta.totalQ}문제 인덱스
            </span>
          </div>
          <p className="text-sm text-[var(--gc-ink2)] mb-4">
            이 시험 전 회차 {autoMeta.totalQ}문제를 자동 분석해서 빈출 주제 {autoTopics.length}개로 분류.
            본문은 단계적 보강 예정 — 우선 단원별 빈출 키워드 + 매칭 기출문제로 학습.
          </p>

          <div className="bg-white border border-[var(--gc-hairline)] rounded-2xl p-5 mb-4">
            <ol className="grid gap-2 grid-cols-1 md:grid-cols-2 list-none p-0 m-0">
              {autoTopics.map((t) => {
                const matched = getAutoQuestionsForTopic(stem, t.topicId, 1);
                return (
                  <li key={t.topicId}>
                    <details className="group">
                      <summary className="cursor-pointer px-3 py-2.5 text-sm rounded-md hover:bg-[#FFF7ED] hover:text-[#B45309] transition-colors list-none flex items-start gap-2">
                        <span className="font-mono text-[10px] text-[var(--gc-ink2)] mt-1">
                          {String(t.ord).padStart(2, "0")}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-[var(--gc-ink)] truncate">{t.title}</div>
                          <div className="text-[11px] text-[var(--gc-ink2)] mt-0.5">
                            출제 {t.freq}회 · {t.questionCount}문제 매칭
                          </div>
                        </div>
                        <span className="text-[#B45309] text-xs mt-1">▾</span>
                      </summary>
                      {/* 핵심 키워드 */}
                      {t.keywords.length > 0 && (
                        <div className="px-3 pt-2 pb-3">
                          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--gc-ink2)] mb-1.5">
                            핵심 키워드
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {t.keywords.slice(0, 12).map((k) => (
                              <span
                                key={k}
                                className="text-[11px] px-2 py-0.5 bg-[#FED7AA] text-[#B45309] rounded font-semibold"
                              >
                                {k}
                              </span>
                            ))}
                          </div>
                          {/* 매칭 기출 미리보기 1개 */}
                          {matched[0] && (
                            <div className="mt-3 text-[12px] text-[var(--gc-ink2)] bg-[#F5EFE4] rounded p-2.5">
                              <span className="font-mono text-[10px] text-[#94724D] block mb-1">
                                관련 기출: {matched[0].examLabel.replace(/^[^()]+/, "").slice(1, 30)} {matched[0].questionNumber}번
                              </span>
                              {matched[0].qPreview}…
                            </div>
                          )}
                        </div>
                      )}
                    </details>
                  </li>
                );
              })}
            </ol>
          </div>

          <p className="text-[11px] font-mono text-[var(--gc-ink2)]">
            본문 단권화 노트 — 트래픽 인기 시험부터 단계적 작성 (현재: 9급 국가직 13과목 본문 LIVE)
          </p>
        </section>
      )}

      {/* 단권화 노트 — 매칭되면 페이지 안에서 바로 보여줌 */}
      {civilNote && civilNoteMeta && (
        <>
          {/* 단권화 노트 자체 스타일 — 같은 페이지 내 인젝트 */}
          <style dangerouslySetInnerHTML={{ __html: civilNote.style }} />

          <section className="mt-12">
            <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
              <h2 className="font-serif-kr text-2xl font-black text-[var(--gc-ink)]">
                📚 자동 단권화 — {civilTopics.length}단원
              </h2>
              <Link
                href={`${baseUrl}/notes`}
                className="text-xs font-bold text-[var(--gc-amber)] hover:underline"
              >
                전체 단권화 페이지 →
              </Link>
            </div>
            <p className="text-sm text-[var(--gc-ink2)] mb-4">
              {civilNoteMeta.subtitle} · 200문제 시드 + 빈출 100% 커버
            </p>

            {/* 단원 빠른 이동 */}
            <div className="bg-white border border-[var(--gc-hairline)] rounded-2xl p-5 mb-4">
              <div className="text-xs font-mono uppercase tracking-wider text-[var(--gc-amber)] font-bold mb-3">
                단원별 바로가기
              </div>
              <ol className="grid gap-1 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 list-none p-0 m-0">
                {civilTopics.map((t) => (
                  <li key={t.topicId}>
                    <Link
                      href={`/civil-notes/${civilNoteMeta.slug}/${t.topicId}`}
                      className="block px-3 py-2 text-sm text-[var(--gc-ink)] rounded-md hover:bg-[#FFF7ED] hover:text-[#B45309] transition-colors"
                    >
                      <span className="font-mono text-[10px] text-[var(--gc-ink2)] mr-1.5">
                        {String(t.ord).padStart(2, "0")}
                      </span>
                      {t.title}
                      {t.freq > 0 && (
                        <span className="ml-1.5 text-[10px] text-[#B45309] font-bold">
                          [{t.freq}회]
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ol>
            </div>

            {/* 본문 풀로 인젝트 — 단권화 노트 자체 */}
            <article
              className="civil-note-body"
              dangerouslySetInnerHTML={{ __html: civilNote.body }}
            />
          </section>
        </>
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
