"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { getExamHistory, getGradeColor, type ExamRecord } from "@/lib/exam-history";
import { getWrongAnswers, type WrongAnswer } from "@/lib/wrong-answers";
import { useCurrentExamSlug, useCurrentSubjectSlug } from "@/lib/exam-context";

const ERA_ORDER = ["선사·고조선", "삼국", "남북국", "고려", "조선 전기", "조선 후기", "근대", "현대"];

function getBarColor(pct: number) {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 60) return "bg-amber-500";
  return "bg-red-500";
}

function getPctColor(pct: number) {
  if (pct >= 80) return "text-emerald-600";
  if (pct >= 60) return "text-amber-600";
  return "text-red-500";
}

export default function MyRecord() {
  const examSlug = useCurrentExamSlug();
  const subjectSlug = useCurrentSubjectSlug();
  const [history, setHistory] = useState<ExamRecord[]>([]);
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswer[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setHistory(getExamHistory(examSlug, subjectSlug));
    setWrongAnswers(getWrongAnswers(examSlug, subjectSlug));
    setMounted(true);
  }, [examSlug, subjectSlug]);

  const stats = useMemo(() => {
    if (history.length === 0) return null;
    const totalScore = history.reduce((s, r) => s + r.score, 0);
    const totalAnswered = history.reduce((s, r) => s + r.total, 0);
    const avgPercentage = totalAnswered > 0 ? Math.round((totalScore / totalAnswered) * 100) : 0;
    const grade1Count = history.filter((r) => r.grade === "1급").length;
    const bestGrade = grade1Count > 0 ? "1급" : history.some((r) => r.grade === "2급") ? "2급" : history.some((r) => r.grade === "3급") ? "3급" : "—";

    return { avgPercentage, grade1Count, totalExams: history.length, bestGrade };
  }, [history]);

  const eraWeakness = useMemo(() => {
    const unresolved = wrongAnswers.filter((a) => !a.resolved);
    const byEra: Record<string, number> = {};
    for (const a of unresolved) byEra[a.era] = (byEra[a.era] || 0) + 1;
    return ERA_ORDER
      .filter((era) => byEra[era])
      .map((era) => ({ era, count: byEra[era] }))
      .sort((a, b) => b.count - a.count);
  }, [wrongAnswers]);

  const categoryWeakness = useMemo(() => {
    const unresolved = wrongAnswers.filter((a) => !a.resolved);
    const byCat: Record<string, number> = {};
    for (const a of unresolved) {
      const cat = a.category || "기타";
      byCat[cat] = (byCat[cat] || 0) + 1;
    }
    return Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  }, [wrongAnswers]);

  if (!mounted) {
    return <div className="py-20 text-center text-gray-400">로딩 중...</div>;
  }

  const unresolvedCount = wrongAnswers.filter((a) => !a.resolved).length;

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          <h1 className="text-2xl font-extrabold text-gray-900">내 학습 기록</h1>
        </div>
        {history.length > 0 && (
          <button
            onClick={() => {
              if (!confirm("모든 풀이 기록을 초기화하시겠습니까?")) return;
              localStorage.removeItem("exam-history");
              setHistory([]);
            }}
            className="text-xs font-medium text-gray-400 hover:text-red-500 transition-colors"
          >
            초기화
          </button>
        )}
      </div>

      {/* No data */}
      {history.length === 0 && unresolvedCount === 0 && (
        <div className="py-16 text-center">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-sm text-gray-400 mb-4">아직 풀이 기록이 없습니다</p>
          <Link href="/study" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors">
            학습 시작하기
          </Link>
        </div>
      )}

      {/* Summary Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-white border border-gray-200/80 p-5">
            <p className="text-3xl font-extrabold text-emerald-600">{stats.totalExams}</p>
            <p className="text-sm text-gray-500 mt-1">풀이한 시험</p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-200/80 p-5">
            <p className="text-3xl font-extrabold text-amber-500">{stats.avgPercentage}%</p>
            <p className="text-sm text-gray-500 mt-1">평균 정답률</p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-200/80 p-5">
            <p className="text-3xl font-extrabold text-indigo-500">{stats.bestGrade}</p>
            <p className="text-sm text-gray-500 mt-1">예상 급수</p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-200/80 p-5">
            <p className="text-3xl font-extrabold text-red-500">{unresolvedCount}</p>
            <p className="text-sm text-gray-500 mt-1">오답 문제</p>
          </div>
        </div>
      )}

      {/* Exam History Table */}
      {history.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">시험 풀이 기록</h2>
          <div className="rounded-2xl bg-white border border-gray-200/80 overflow-hidden">
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-[1fr_80px_80px_1fr_100px] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200/80">
              <span className="text-xs font-semibold text-gray-400">시험</span>
              <span className="text-xs font-semibold text-gray-400">점수</span>
              <span className="text-xs font-semibold text-gray-400">급수</span>
              <span className="text-xs font-semibold text-gray-400">정답률</span>
              <span className="text-xs font-semibold text-gray-400">날짜</span>
            </div>
            {/* Rows */}
            {history.map((record) => {
              const gradeColor = getGradeColor(record.grade);
              const date = new Date(record.date);
              const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;

              return (
                <Link
                  key={`${record.examNumber}-${record.date}`}
                  href={`/exam/${record.examNumber}/1`}
                  className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_80px_80px_1fr_100px] gap-3 md:gap-4 items-center px-5 py-3.5 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-semibold text-gray-900">제{record.examNumber}회</span>
                  <span className="hidden md:block text-sm text-gray-700">{record.score}/{record.total}</span>
                  <span className={`hidden md:inline-block rounded-full px-2.5 py-0.5 text-xs font-bold w-fit ${gradeColor.bg} ${gradeColor.text}`}>
                    {record.grade}
                  </span>
                  <div className="hidden md:flex items-center gap-3">
                    <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${getBarColor(record.percentage)}`}
                        style={{ width: `${record.percentage}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold ${getPctColor(record.percentage)}`}>{record.percentage}%</span>
                  </div>
                  <span className="text-xs text-gray-400 text-right md:text-left">{dateStr}</span>
                  {/* Mobile: show score + grade inline */}
                  <div className="flex items-center gap-2 md:hidden">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${gradeColor.bg} ${gradeColor.text}`}>{record.grade}</span>
                    <span className="text-sm font-bold text-gray-800">{record.percentage}%</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Weakness Analysis */}
      {(eraWeakness.length > 0 || categoryWeakness.length > 0) && (
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">약점 분석</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* By Era */}
            {eraWeakness.length > 0 && (
              <div className="rounded-2xl bg-white border border-gray-200/80 p-5">
                <p className="text-[15px] font-bold text-gray-900 mb-4">시대별 약점</p>
                <div className="space-y-3">
                  {eraWeakness.slice(0, 5).map(({ era, count }) => {
                    const maxCount = eraWeakness[0].count;
                    const pct = Math.round((count / maxCount) * 100);
                    return (
                      <div key={era} className="space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-xs font-medium text-gray-500">{era}</span>
                          <span className={`text-xs font-bold ${getPctColor(100 - pct)}`}>{count}문제</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${getBarColor(100 - pct)}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* By Category */}
            {categoryWeakness.length > 0 && (
              <div className="rounded-2xl bg-white border border-gray-200/80 p-5">
                <p className="text-[15px] font-bold text-gray-900 mb-4">유형별 약점</p>
                <div className="space-y-3">
                  {categoryWeakness.slice(0, 5).map(([cat, count]) => {
                    const maxCount = categoryWeakness[0][1];
                    const pct = Math.round((count / maxCount) * 100);
                    return (
                      <div key={cat} className="space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-xs font-medium text-gray-500">{cat}</span>
                          <span className={`text-xs font-bold ${getPctColor(100 - pct)}`}>{count}문제</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${getBarColor(100 - pct)}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Link
          href="/wrong-answers"
          className="flex-1 rounded-2xl bg-white border border-gray-200/80 p-5 text-center hover:shadow-md hover:-translate-y-0.5 transition-all"
        >
          <svg className="w-6 h-6 text-red-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-bold text-gray-700">오답 복습</p>
          {unresolvedCount > 0 && (
            <p className="text-xs text-red-500 font-semibold mt-1">{unresolvedCount}문제</p>
          )}
        </Link>
        <Link
          href="/study"
          className="flex-1 rounded-2xl bg-white border border-gray-200/80 p-5 text-center hover:shadow-md hover:-translate-y-0.5 transition-all"
        >
          <svg className="w-6 h-6 text-emerald-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="text-sm font-bold text-gray-700">학습하기</p>
        </Link>
      </div>
    </div>
  );
}
