"use client";

import { useState } from "react";
import type { CbtQuestion } from "@/lib/cbt-data";

interface Props {
  question: CbtQuestion;
}

/**
 * 자격증/CBT 문제 카드. 한능검 QuestionCard보다 단순:
 * - 지문(텍스트+이미지) → 4지선다 → 정답 클릭 → 정답/오답 표시 + 해설.
 */
export default function CbtQuestionCard({ question }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const handleSelect = (n: number) => {
    if (revealed) return;
    setSelected(n);
  };

  const handleReveal = () => {
    if (selected != null) setRevealed(true);
  };

  const isCorrect = selected === question.correct_answer;

  return (
    <article className="rounded-2xl border border-[var(--gc-hairline)] bg-white p-5 md:p-7">
      <header className="flex items-baseline gap-2 mb-3">
        <span className="font-mono text-xs uppercase tracking-wider text-[var(--gc-amber)]">
          문제 {question.number}
        </span>
        {question.answer_rate != null && (
          <span className="font-mono text-[10px] text-[var(--gc-ink2)]">
            정답률 {Math.round(question.answer_rate * 100)}%
          </span>
        )}
      </header>

      {question.text && (
        <div className="text-base md:text-lg text-[var(--gc-ink)] leading-relaxed whitespace-pre-wrap">
          {question.text}
        </div>
      )}

      {question.images && question.images.length > 0 && (
        <div className="mt-4 grid gap-3">
          {question.images.map((img, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={img.url}
              alt={`문제 ${question.number} 이미지 ${i + 1}`}
              className="rounded-xl border border-[var(--gc-hairline)] max-w-full"
              loading="lazy"
            />
          ))}
        </div>
      )}

      <ul className="mt-5 space-y-2.5">
        {question.choices.map((c) => {
          const isSelected = selected === c.number;
          const showCorrect = revealed && c.is_correct;
          const showWrong = revealed && isSelected && !c.is_correct;
          return (
            <li key={c.number}>
              <button
                type="button"
                onClick={() => handleSelect(c.number)}
                disabled={revealed}
                className={`w-full text-left rounded-xl border p-4 transition-all ${
                  showCorrect
                    ? "border-[#0D9488] bg-[#CCFBF1] text-[#115E59]"
                    : showWrong
                    ? "border-[#BE123C] bg-[#FECDD3] text-[#7F1D1D]"
                    : isSelected
                    ? "border-[var(--gc-amber)] bg-[#FED7AA]/40 text-[var(--gc-ink)]"
                    : "border-[var(--gc-hairline)] bg-white text-[var(--gc-ink)] hover:border-[var(--gc-amber)]"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <span className="font-mono text-sm font-bold shrink-0 mt-0.5">
                    {c.number}.
                  </span>
                  <div className="flex-1">
                    {c.text}
                    {c.images && c.images.length > 0 && (
                      <div className="mt-2 grid gap-2">
                        {c.images.map((img, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={i} src={img.url} alt="" className="rounded-md max-w-full" loading="lazy" />
                        ))}
                      </div>
                    )}
                  </div>
                  {showCorrect && <span className="text-lg shrink-0">✓</span>}
                  {showWrong && <span className="text-lg shrink-0">✗</span>}
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {!revealed && (
        <button
          type="button"
          onClick={handleReveal}
          disabled={selected == null}
          className="mt-5 w-full rounded-xl bg-[var(--gc-ink)] text-white px-4 py-3 text-sm font-bold disabled:bg-[var(--gc-ink2)]/40"
        >
          정답 확인
        </button>
      )}

      {revealed && (
        <div
          className={`mt-5 rounded-xl border p-4 ${
            isCorrect
              ? "border-[#0D9488] bg-[#CCFBF1]/50 text-[#115E59]"
              : "border-[#BE123C] bg-[#FECDD3]/50 text-[#7F1D1D]"
          }`}
        >
          <div className="font-bold">
            {isCorrect ? "정답입니다 ✓" : `오답 — 정답은 ${question.correct_answer}번`}
          </div>
          {question.explanation && (
            <p className="mt-2 text-sm whitespace-pre-wrap text-[var(--gc-ink)]">
              {question.explanation}
            </p>
          )}
        </div>
      )}
    </article>
  );
}
