"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { getExamHistory, getGradeColor, type ExamRecord } from "@/lib/exam-history";
import { getWrongAnswers, type WrongAnswer } from "@/lib/wrong-answers";

const ERA_ORDER = ["선사·고조선", "삼국", "남북국", "고려", "조선 전기", "조선 후기", "근대", "현대"];

export default function MyRecord() {
  const [history, setHistory] = useState<ExamRecord[]>([]);
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswer[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setHistory(getExamHistory());
    setWrongAnswers(getWrongAnswers());
    setMounted(true);
  }, []);

  // Overall stats
  const stats = useMemo(() => {
    if (history.length === 0) return null;

    const totalScore = history.reduce((s, r) => s + r.score, 0);
    const totalAnswered = history.reduce((s, r) => s + r.total, 0);
    const avgPercentage = totalAnswered > 0 ? Math.round((totalScore / totalAnswered) * 100) : 0;
    const bestRecord = history.reduce((best, r) => r.percentage > best.percentage ? r : best, history[0]);
    const grade1Count = history.filter((r) => r.grade === "1급").length;

    return { totalScore, totalAnswered, avgPercentage, bestRecord, grade1Count, totalExams: history.length };
  }, [history]);

  // Weakness by era
  const eraWeakness = useMemo(() => {
    const unresolved = wrongAnswers.filter((a) => !a.resolved);
    const byEra: Record<string, number> = {};
    for (const a of unresolved) {
      byEra[a.era] = (byEra[a.era] || 0) + 1;
    }
    return ERA_ORDER
      .filter((era) => byEra[era])
      .map((era) => ({ era, count: byEra[era] }))
      .sort((a, b) => b.count - a.count);
  }, [wrongAnswers]);

  // Category weakness
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
    return <div className="py-20 text-center text-slate-400">로딩 중...</div>;
  }

  const unresolvedCount = wrongAnswers.filter((a) => !a.resolved).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-black text-slate-800">내 기록</h1>
        {history.length > 0 && (
          <button
            onClick={() => {
              if (!confirm("모든 풀이 기록을 초기화하시겠습니까?")) return;
              localStorage.removeItem("exam-history");
              setHistory([]);
            }}
            className="text-[11px] font-semibold text-slate-400 hover:text-red-500 transition-colors"
          >
            초기화
          </button>
        )}
      </div>
      <p className="text-sm text-slate-400 mb-5">학습 현황과 약점 분석</p>

      {/* No data */}
      {history.length === 0 && unresolvedCount === 0 && (
        <div className="py-16 text-center">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-sm text-slate-400 mb-4">아직 풀이 기록이 없습니다</p>
          <Link href="/study" className="btn-primary !rounded-xl !py-2.5 !px-5 text-sm">
            학습 시작하기
          </Link>
        </div>
      )}

      {/* Overall Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          <div className="rounded-2xl bg-white/90 p-4 text-center" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
            <p className="text-2xl font-black text-emerald-600">{stats.avgPercentage}%</p>
            <p className="text-[11px] text-slate-400 mt-0.5 font-semibold">평균 정답률</p>
          </div>
          <div className="rounded-2xl bg-white/90 p-4 text-center" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
            <p className="text-2xl font-black text-amber-600">{stats.grade1Count}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 font-semibold">1급 획득</p>
          </div>
          <div className="rounded-2xl bg-white/90 p-4 text-center" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
            <p className="text-2xl font-black text-slate-700">{stats.totalExams}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 font-semibold">응시 횟수</p>
          </div>
        </div>
      )}

      {/* Exam History */}
      {history.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-black text-slate-700 mb-3">회차별 기록</h2>
          <div className="space-y-2">
            {history.map((record) => {
              const gradeColor = getGradeColor(record.grade);
              const date = new Date(record.date);
              const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;

              return (
                <Link
                  key={`${record.examNumber}-${record.date}`}
                  href={`/exam/${record.examNumber}/1`}
                  className="flex items-center gap-3 rounded-2xl bg-white/90 border border-slate-200/50 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
                  style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}
                >
                  {/* Exam number */}
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm font-black shadow-sm shrink-0">
                    {record.examNumber}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">제{record.examNumber}회</span>
                      <span className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${gradeColor.bg} ${gradeColor.text} ${gradeColor.border} border`}>
                        {record.grade}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{dateStr}</p>
                  </div>

                  {/* Score */}
                  <div className="text-right shrink-0">
                    <p className="text-lg font-black text-slate-800">{record.percentage}%</p>
                    <p className="text-[11px] text-slate-400">{record.score}/{record.total}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Weakness Analysis */}
      {(eraWeakness.length > 0 || categoryWeakness.length > 0) && (
        <section className="mb-6">
          <h2 className="text-sm font-black text-slate-700 mb-3">
            약점 분석
            <span className="font-normal text-slate-400 ml-1">(미해결 오답 기준)</span>
          </h2>

          <div className="rounded-2xl bg-white/90 p-5" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
            {/* By Era */}
            {eraWeakness.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-bold text-slate-500 mb-2">시대별</p>
                <div className="space-y-2">
                  {eraWeakness.slice(0, 5).map(({ era, count }) => {
                    const maxCount = eraWeakness[0].count;
                    return (
                      <div key={era} className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-slate-600 w-16 shrink-0 text-right">{era.replace("·", "/")}</span>
                        <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-red-400 to-orange-400"
                            style={{ width: `${(count / maxCount) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-red-500 w-6 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* By Category */}
            {categoryWeakness.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-500 mb-2">유형별</p>
                <div className="flex gap-2">
                  {categoryWeakness.map(([cat, count]) => (
                    <div key={cat} className="flex-1 rounded-xl bg-slate-50 p-3 text-center">
                      <p className="text-lg font-black text-slate-700">{count}</p>
                      <p className="text-[11px] font-semibold text-slate-400">{cat}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <div className="flex gap-2.5">
        <Link
          href="/wrong-answers"
          className="flex-1 rounded-2xl bg-white/90 border border-slate-200/50 p-4 text-center hover:shadow-md transition-all"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}
        >
          <span className="text-xl block mb-1">🔄</span>
          <p className="text-xs font-bold text-slate-700">오답 복습</p>
          {unresolvedCount > 0 && (
            <p className="text-[11px] text-red-500 font-semibold mt-0.5">{unresolvedCount}문제</p>
          )}
        </Link>
        <Link
          href="/study"
          className="flex-1 rounded-2xl bg-white/90 border border-slate-200/50 p-4 text-center hover:shadow-md transition-all"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}
        >
          <span className="text-xl block mb-1">📚</span>
          <p className="text-xs font-bold text-slate-700">학습하기</p>
        </Link>
      </div>
    </div>
  );
}
