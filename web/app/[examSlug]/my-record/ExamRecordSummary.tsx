"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BreadCrumb from "@/components/BreadCrumb";
import { getExamHistory, getGradeColor, type ExamRecord } from "@/lib/exam-history";

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

interface SubjectStats extends SubjectInfo {
  attempts: number;
  avgPercentage: number;
  bestGrade: string;
  bestPercentage: number;
}

export default function ExamRecordSummary({
  exam,
  subjects,
}: {
  exam: ExamPlain;
  subjects: SubjectInfo[];
}) {
  const [stats, setStats] = useState<SubjectStats[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const enriched = subjects.map<SubjectStats>((s) => {
      const records: ExamRecord[] = getExamHistory(exam.slug, s.slug);
      const attempts = records.length;
      const totalScore = records.reduce((sum, r) => sum + r.score, 0);
      const totalAnswered = records.reduce((sum, r) => sum + r.total, 0);
      const avg = totalAnswered > 0 ? Math.round((totalScore / totalAnswered) * 100) : 0;
      const best = records.reduce((b, r) => (r.percentage > b ? r.percentage : b), 0);
      const bestGrade =
        best >= 80 ? "1급" : best >= 70 ? "2급" : best >= 60 ? "3급" : attempts ? "불합격" : "—";
      return {
        ...s,
        attempts,
        avgPercentage: avg,
        bestGrade,
        bestPercentage: best,
      };
    });
    setStats(enriched);
    setMounted(true);
  }, [exam.slug, subjects]);

  const withData = stats.filter((s) => s.attempts > 0);
  const empty = stats.filter((s) => s.attempts === 0);

  return (
    <div>
      <BreadCrumb
        items={[
          { label: "기출노트", href: "/" },
          { label: exam.label, href: exam.routesMain },
          { label: "내 기록" },
        ]}
      />

      <h1 className="text-xl font-extrabold text-slate-900 mb-0.5">{exam.shortLabel} 내 기록</h1>
      <p className="text-slate-500 text-[13px] mb-5">
        과목별 점수 / 평균 정답률 / 최고 등급
      </p>

      {!mounted && (
        <div className="py-12 text-center text-slate-400 text-sm">로딩 중...</div>
      )}

      {mounted && withData.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center card-shadow">
          <p className="text-slate-500 text-sm">
            아직 학습 기록이 없습니다. 풀이를 시작하면 점수와 약점이 자동 누적됩니다.
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
            {withData.map((s) => {
              const gc = getGradeColor(s.bestGrade);
              return (
                <Link
                  key={s.id}
                  href={`${exam.routesMain}/${encodeURIComponent(s.slug)}/my-record`}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 card-shadow hover:card-shadow-md hover:border-indigo-300 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl shrink-0">📝</span>
                    <span className="font-bold text-[15px] text-slate-900 truncate">{s.label}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 shrink-0">
                      {s.attempts}회
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 shrink-0">
                      평균 {s.avgPercentage}%
                    </span>
                    <span
                      className={`rounded-full ${gc.bg} ${gc.text} px-2 py-0.5 text-[11px] font-bold shrink-0 border ${gc.border}`}
                    >
                      최고 {s.bestGrade}
                    </span>
                  </div>
                  <svg className="h-4 w-4 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              );
            })}
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
