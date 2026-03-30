"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import QuestionCard, { type RelatedNoteLink } from "@/components/QuestionCard";
import type { Question } from "@/lib/types";

interface StudyQuestion extends Question {
  examNumber: number;
  youtube?: { videoId: string; startSeconds: number; channelName: string } | null;
  relatedNotes?: RelatedNoteLink[];
}

interface SessionData {
  ids: number[];
  title: string;
  totalAvailable?: number;
}

export default function StudySession() {
  const router = useRouter();
  const [questions, setQuestions] = useState<StudyQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("학습");
  const [answered, setAnswered] = useState<Set<number>>(new Set());

  useEffect(() => {
    const raw = sessionStorage.getItem("studySession");
    if (!raw) {
      router.replace("/study");
      return;
    }

    const session: SessionData = JSON.parse(raw);
    setTitle(session.title);

    fetch("/api/study/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: session.ids }),
    })
      .then((r) => r.json())
      .then((data) => setQuestions(data.questions || []))
      .catch(() => router.replace("/study"))
      .finally(() => setLoading(false));
  }, [router]);

  const handleAnswer = () => {
    setAnswered((prev) => new Set(prev).add(current));
  };

  const goTo = (idx: number) => {
    if (idx >= 0 && idx < questions.length) {
      setCurrent(idx);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block w-6 h-6 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-400 mt-3">문제를 불러오는 중...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-slate-400 mb-4">문제를 찾을 수 없습니다.</p>
        <Link href="/study" className="text-indigo-500 font-semibold text-sm">
          학습하기로 돌아가기
        </Link>
      </div>
    );
  }

  const q = questions[current];
  const progress = answered.size;
  const total = questions.length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm font-semibold text-slate-400 hover:text-slate-600"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          나가기
        </button>
        <span className="text-xs font-bold text-slate-400">{title}</span>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-2xl font-black text-indigo-500">
            {current + 1}
            <span className="text-sm font-bold text-slate-300 ml-1">/ {total}</span>
          </span>
          <span className="text-xs font-semibold text-slate-400">
            {progress}문제 완료
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
            style={{ width: `${(progress / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Question navigator dots */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {questions.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-all ${
              i === current
                ? "bg-indigo-500 text-white shadow-sm"
                : answered.has(i)
                ? "bg-emerald-100 text-emerald-600"
                : "bg-slate-100 text-slate-400 hover:bg-slate-200"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Question info */}
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-xl font-black text-indigo-500">
          {q.questionNumber}.
        </span>
        <span className="text-sm font-medium text-slate-400">
          [{q.points}점]
        </span>
      </div>

      {/* Question card */}
      <QuestionCard
        key={`${current}-${q.id}`}
        question={q}
        onAnswerSubmit={handleAnswer}
        youtube={q.youtube}
        relatedNotes={q.relatedNotes}
      />

      {/* Navigation */}
      <div className="flex gap-2.5 mt-5 mb-4">
        <button
          onClick={() => goTo(current - 1)}
          disabled={current === 0}
          className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-colors"
        >
          이전
        </button>
        {current < total - 1 ? (
          <button
            onClick={() => goTo(current + 1)}
            className="flex-1 btn-primary !rounded-xl !py-3 text-sm"
          >
            다음
          </button>
        ) : (
          <button
            onClick={() => router.back()}
            className="flex-1 btn-primary !rounded-xl !py-3 text-sm"
          >
            완료
          </button>
        )}
      </div>
    </div>
  );
}
