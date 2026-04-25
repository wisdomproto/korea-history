"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BreadCrumb from "@/components/BreadCrumb";
import { getWrongAnswers } from "@/lib/wrong-answers";

interface ExamPlain {
  id: string;
  slug: string;
  label: string;
  shortLabel: string;
  routesMain: string;
}

interface SubjectInfo {
  id: string;
  slug: string;
  label: string;
  shortLabel: string;
}

interface SubjectWithCounts extends SubjectInfo {
  total: number;
  unresolved: number;
}

export default function ExamWrongSummary({
  exam,
  subjects,
}: {
  exam: ExamPlain;
  subjects: SubjectInfo[];
}) {
  const [withCounts, setWithCounts] = useState<SubjectWithCounts[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const enriched = subjects.map<SubjectWithCounts>((s) => {
      const all = getWrongAnswers(exam.slug, s.slug);
      return {
        ...s,
        total: all.length,
        unresolved: all.filter((a) => !a.resolved).length,
      };
    });
    setWithCounts(enriched);
    setMounted(true);
  }, [exam.slug, subjects]);

  const withData = withCounts.filter((s) => s.total > 0);
  const empty = withCounts.filter((s) => s.total === 0);

  return (
    <div>
      <BreadCrumb
        items={[
          { label: "기출노트", href: "/" },
          { label: exam.label, href: exam.routesMain },
          { label: "오답노트" },
        ]}
      />

      <h1 className="text-xl font-extrabold text-slate-900 mb-0.5">{exam.shortLabel} 오답노트</h1>
      <p className="text-slate-500 text-[13px] mb-5">
        과목별로 자동 수집된 오답을 확인하고 다시 풀어볼 수 있습니다.
      </p>

      {!mounted && (
        <div className="py-12 text-center text-slate-400 text-sm">로딩 중...</div>
      )}

      {mounted && withData.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center card-shadow">
          <p className="text-slate-500 text-sm">
            아직 오답이 없습니다. 기출문제를 풀면 틀린 문제가 자동으로 여기 누적됩니다.
          </p>
          <Link
            href={exam.routesMain}
            className="mt-4 inline-block rounded-full bg-slate-900 text-white px-5 py-2 text-sm font-bold hover:bg-amber-600"
          >
            과목 선택해 풀기 →
          </Link>
        </div>
      )}

      {mounted && withData.length > 0 && (
        <>
          <h2 className="text-sm font-bold text-slate-700 mb-3">학습한 과목</h2>
          <div className="space-y-2 mb-8">
            {withData.map((s) => (
              <Link
                key={s.id}
                href={`${exam.routesMain}/${encodeURIComponent(s.slug)}/wrong-answers`}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 card-shadow hover:card-shadow-md hover:border-indigo-300 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl shrink-0">📝</span>
                  <span className="font-bold text-[15px] text-slate-900 truncate">{s.label}</span>
                  <span className="rounded-full bg-rose-50 text-rose-700 px-2 py-0.5 text-[11px] font-bold shrink-0">
                    오답 {s.unresolved}개
                  </span>
                  {s.total !== s.unresolved && (
                    <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[11px] font-bold shrink-0">
                      해결 {s.total - s.unresolved}
                    </span>
                  )}
                </div>
                <svg className="h-4 w-4 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </>
      )}

      {mounted && empty.length > 0 && (
        <details className="rounded-2xl border border-slate-200 bg-white p-4 card-shadow">
          <summary className="cursor-pointer text-sm font-semibold text-slate-600">
            아직 풀지 않은 과목 ({empty.length}개)
          </summary>
          <div className="mt-3 grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {empty.map((s) => (
              <Link
                key={s.id}
                href={`${exam.routesMain}/${encodeURIComponent(s.slug)}/exam`}
                className="text-xs text-slate-700 hover:text-amber-600 px-2 py-1 rounded-md hover:bg-slate-50"
              >
                {s.label} →
              </Link>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
