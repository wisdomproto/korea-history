"use client";

import Link from "next/link";
import { useRef, useEffect, useState } from "react";

interface QuestionNavProps {
  examNumber: number;
  currentQuestion: number;
  totalQuestions: number;
}

const ANSWERED_KEY_PREFIX = "answered-";

function getAnsweredSet(examNumber: number): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(`${ANSWERED_KEY_PREFIX}${examNumber}`);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function markAnswered(examNumber: number, questionNumber: number) {
  if (typeof window === "undefined") return;
  const set = getAnsweredSet(examNumber);
  set.add(questionNumber);
  localStorage.setItem(
    `${ANSWERED_KEY_PREFIX}${examNumber}`,
    JSON.stringify([...set])
  );
}

export default function QuestionNav({
  examNumber,
  currentQuestion,
  totalQuestions,
}: QuestionNavProps) {
  const hasPrev = currentQuestion > 1;
  const hasNext = currentQuestion < totalQuestions;
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLAnchorElement>(null);
  const [answered, setAnswered] = useState<Set<number>>(new Set());

  useEffect(() => {
    setAnswered(getAnsweredSet(examNumber));
  }, [examNumber]);

  useEffect(() => {
    const handler = () => setAnswered(getAnsweredSet(examNumber));
    window.addEventListener("answer-revealed", handler);
    return () => window.removeEventListener("answer-revealed", handler);
  }, [examNumber]);

  useEffect(() => {
    if (currentRef.current && scrollRef.current) {
      const el = currentRef.current;
      const container = scrollRef.current;
      const scrollLeft =
        el.offsetLeft - container.clientWidth / 2 + el.clientWidth / 2;
      container.scrollTo({ left: scrollLeft, behavior: "smooth" });
    }
  }, [currentQuestion]);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.6;
    scrollRef.current.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <div className="space-y-2">
      {/* Dot navigator */}
      <div className="card flex items-center gap-1 !rounded-2xl overflow-hidden py-2 px-1">
        <button
          onClick={() => scroll("left")}
          className="flex h-9 w-7 shrink-0 items-center justify-center text-slate-300 hover:text-indigo-500 transition-colors"
          aria-label="스크롤 왼쪽"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div
          ref={scrollRef}
          className="flex flex-1 gap-1.5 overflow-x-auto py-0.5 hide-scrollbar"
        >
          {Array.from({ length: totalQuestions }, (_, i) => {
            const num = i + 1;
            const isCurrent = num === currentQuestion;
            const isAnswered = answered.has(num);

            let dotClass = "nav-dot ";
            if (isCurrent) dotClass += "nav-dot-current";
            else if (isAnswered) dotClass += "nav-dot-answered";
            else dotClass += "nav-dot-unanswered";

            return (
              <Link
                key={num}
                ref={isCurrent ? currentRef : undefined}
                href={`/exam/${examNumber}/${num}`}
                className={dotClass}
              >
                {num}
              </Link>
            );
          })}
        </div>

        <button
          onClick={() => scroll("right")}
          className="flex h-9 w-7 shrink-0 items-center justify-center text-slate-300 hover:text-indigo-500 transition-colors"
          aria-label="스크롤 오른쪽"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Action bar */}
      <div className="card flex items-center gap-2 !rounded-2xl p-2.5">
        {hasPrev ? (
          <Link
            href={`/exam/${examNumber}/${currentQuestion - 1}`}
            className="btn-secondary flex-1 flex items-center justify-center gap-1 !rounded-xl py-2.5 text-sm"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            이전
          </Link>
        ) : (
          <div className="flex-1 rounded-xl bg-slate-50 py-2.5 text-center text-sm font-semibold text-slate-300">
            이전
          </div>
        )}

        <div className="px-3 text-center">
          <span className="text-xs font-bold text-slate-400">
            {currentQuestion} / {totalQuestions}
          </span>
        </div>

        {hasNext ? (
          <Link
            href={`/exam/${examNumber}/${currentQuestion + 1}`}
            className="btn-secondary flex-1 flex items-center justify-center gap-1 !rounded-xl py-2.5 text-sm"
          >
            다음
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ) : (
          <Link
            href={`/exam/${examNumber}/result`}
            className="btn-primary flex-1 !rounded-xl py-2.5 text-center text-sm"
          >
            제출하기
          </Link>
        )}
      </div>
    </div>
  );
}
