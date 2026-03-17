"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getWrongAnswers } from "@/lib/wrong-answers";

interface Props {
  examNumber: number;
}

export default function ExamResult({ examNumber }: Props) {
  const [stats, setStats] = useState<{
    total: number;
    correct: number;
    wrong: number;
    wrongByEra: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    const allWrong = getWrongAnswers();
    const examWrong = allWrong.filter(
      (a) => a.examNumber === examNumber && !a.resolved
    );

    const wrongByEra: Record<string, number> = {};
    for (const w of examWrong) {
      wrongByEra[w.era] = (wrongByEra[w.era] || 0) + 1;
    }

    setStats({
      total: 50,
      correct: 50 - examWrong.length,
      wrong: examWrong.length,
      wrongByEra,
    });
  }, [examNumber]);

  if (!stats) {
    return (
      <div className="py-20 text-center text-gray-400 text-sm">로딩 중...</div>
    );
  }

  const percentage = Math.round((stats.correct / stats.total) * 100);
  const emoji = percentage >= 80 ? "🎉" : percentage >= 60 ? "👍" : "💪";

  return (
    <div className="py-6">
      {/* Score */}
      <div className="text-center mb-6">
        <p className="text-5xl mb-3">{emoji}</p>
        <h1 className="text-2xl font-black text-slate-900 mb-1">
          제{examNumber}회 결과
        </h1>
        <p className="text-sm text-gray-500">
          {stats.total}문제 중{" "}
          <span className="font-bold text-indigo-600">
            {stats.correct}문제 정답
          </span>
        </p>
      </div>

      {/* Score card */}
      <div className="rounded-2xl border border-[#E8E8F4] bg-white p-5 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-500">정답률</span>
          <span className="text-2xl font-black text-indigo-600">
            {percentage}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-[#F1F0FF]">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span>정답 {stats.correct}</span>
          <span>오답 {stats.wrong}</span>
        </div>
      </div>

      {/* Wrong by era */}
      {stats.wrong > 0 && Object.keys(stats.wrongByEra).length > 0 && (
        <div className="rounded-2xl border border-[#E8E8F4] bg-white p-5 shadow-sm mb-6">
          <h2 className="text-sm font-bold text-gray-800 mb-3">
            시대별 오답 분포
          </h2>
          <div className="space-y-2">
            {Object.entries(stats.wrongByEra)
              .sort((a, b) => b[1] - a[1])
              .map(([era, count]) => (
                <div key={era} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-20 shrink-0">
                    {era}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-red-400"
                      style={{
                        width: `${(count / stats.wrong) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium text-red-500 w-8 text-right">
                    {count}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        {stats.wrong > 0 && (
          <Link
            href="/wrong-answers"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-3 text-sm font-bold text-white hover:bg-amber-500 transition-colors"
          >
            🔄 오답 복습하기 ({stats.wrong}문제)
          </Link>
        )}
        <Link
          href={`/exam/${examNumber}/1`}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E8E8F4] bg-white py-3 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
        >
          다시 풀기
        </Link>
        <Link
          href="/study"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E8E8F4] bg-white py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          학습하기로 돌아가기
        </Link>
      </div>
    </div>
  );
}
