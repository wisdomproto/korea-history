"use client";

import { useState } from "react";
import { Question } from "@/lib/types";

const CHOICE_LABELS = ["①", "②", "③", "④", "⑤"];

interface QuestionCardProps {
  question: Question;
  onAnswerSubmit?: (selectedAnswer: number, isCorrect: boolean) => void;
}

export default function QuestionCard({
  question,
  onAnswerSubmit,
}: QuestionCardProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const handleReveal = () => {
    if (selected === null) return;
    setRevealed(true);
    const isCorrect = selected === question.correctAnswer;
    onAnswerSubmit?.(selected, isCorrect);
  };

  return (
    <div>
      {/* Question image */}
      {question.imageUrl && (
        <div className="mb-4 overflow-hidden rounded-xl border border-gray-200">
          <img
            src={question.imageUrl}
            alt={`제${question.questionNumber}번 문제 자료`}
            className="w-full"
            loading="lazy"
          />
        </div>
      )}

      {/* Question content */}
      <p className="mb-4 text-base leading-relaxed">{question.content}</p>

      {/* Choices */}
      <div className="space-y-2 mb-4">
        {question.choices.map((choice, i) => {
          const choiceNum = i + 1;
          const isCorrect = choiceNum === question.correctAnswer;
          const isSelected = selected === choiceNum;
          const choiceImage = question.choiceImages?.[i];

          let style = "border-gray-200 hover:border-indigo-300";
          if (revealed) {
            if (isCorrect) style = "border-green-500 bg-green-50";
            else if (isSelected && !isCorrect)
              style = "border-red-400 bg-red-50";
            else style = "border-gray-200 opacity-60";
          } else if (isSelected) {
            style = "border-indigo-500 bg-indigo-50";
          }

          return (
            <button
              key={i}
              onClick={() => !revealed && setSelected(choiceNum)}
              disabled={revealed}
              className={`flex w-full items-start gap-3 rounded-xl border-2 p-3 text-left transition-colors ${style}`}
            >
              <span className="shrink-0 font-medium text-gray-500">
                {CHOICE_LABELS[i]}
              </span>
              <div>
                {choiceImage && (
                  <img
                    src={choiceImage}
                    alt={`보기 ${choiceNum}`}
                    className="mb-1 max-h-24 rounded"
                    loading="lazy"
                  />
                )}
                <span className="text-sm">{choice}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Reveal button */}
      {!revealed && (
        <button
          onClick={handleReveal}
          disabled={selected === null}
          className={`w-full rounded-xl py-3 font-semibold transition-colors ${
            selected !== null
              ? "bg-yellow-400 text-gray-900 hover:bg-yellow-500"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          정답 확인하기
        </button>
      )}

      {/* Explanation (after reveal) */}
      {revealed && (
        <div className="mt-4 rounded-xl bg-gray-50 p-4">
          <p className="font-semibold mb-2">
            {selected === question.correctAnswer ? (
              <span className="text-green-600">✅ 정답!</span>
            ) : (
              <span className="text-red-500">
                ❌ 오답 — 정답: {CHOICE_LABELS[question.correctAnswer - 1]}
              </span>
            )}
          </p>
          {question.explanation && (
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {question.explanation}
            </p>
          )}

          {/* Ad placeholder - replaced with AdSense in Phase 3 */}
          <div
            className="mt-4 flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-100 text-sm text-gray-400"
            data-ad-slot="explanation"
          >
            광고 영역
          </div>
        </div>
      )}
    </div>
  );
}
