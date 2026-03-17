"use client";

import { useState, useRef, useEffect } from "react";
import { Question } from "@/lib/types";

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
  const feedbackRef = useRef<HTMLDivElement>(null);

  const handleReveal = () => {
    if (selected === null) return;
    setRevealed(true);
    const isCorrect = selected === question.correctAnswer;
    onAnswerSubmit?.(selected, isCorrect);
  };

  useEffect(() => {
    if (revealed && feedbackRef.current) {
      setTimeout(() => {
        feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [revealed]);

  const isCorrect = selected === question.correctAnswer;

  return (
    <div>
      {/* Passage image */}
      {question.imageUrl && (
        <div className="passage-box mb-4">
          <img
            src={question.imageUrl}
            alt={`제${question.questionNumber}번 문제 자료`}
            className="w-full max-h-[400px] object-contain rounded-lg"
            loading="lazy"
          />
        </div>
      )}

      {/* Question content */}
      <p className="mb-4 text-[15px] font-medium leading-[26px] text-slate-800">
        {question.content}
      </p>

      {/* Choices */}
      <div className="space-y-2.5 mb-4">
        {question.choices.map((choice, i) => {
          const choiceNum = i + 1;
          const isChoiceCorrect = choiceNum === question.correctAnswer;
          const isSelected = selected === choiceNum;
          const choiceImage = question.choiceImages?.[i];

          let btnClass = "choice-btn";
          let badgeClass = "choice-badge choice-badge-default";
          let badgeContent = <span>{choiceNum}</span>;
          let textClass = "text-slate-800";

          if (revealed) {
            if (isChoiceCorrect) {
              btnClass = "choice-btn choice-btn-correct";
              badgeClass = "choice-badge choice-badge-correct";
              badgeContent = <span>✓</span>;
              textClass = "text-emerald-700 font-semibold";
            } else if (isSelected && !isChoiceCorrect) {
              btnClass = "choice-btn choice-btn-wrong";
              badgeClass = "choice-badge choice-badge-wrong";
              badgeContent = <span>✕</span>;
              textClass = "text-slate-800";
            } else {
              btnClass = "choice-btn choice-btn-dimmed";
              badgeClass = "choice-badge choice-badge-default";
            }
          } else if (isSelected) {
            btnClass = "choice-btn choice-btn-selected";
            badgeClass = "choice-badge choice-badge-selected";
            badgeContent = <span>✓</span>;
            textClass = "text-indigo-700 font-semibold";
          }

          return (
            <button
              key={i}
              onClick={() => !revealed && setSelected(choiceNum)}
              disabled={revealed}
              className={btnClass}
            >
              <div className={badgeClass}>{badgeContent}</div>
              <div className="flex-1 min-w-0">
                {choiceImage && (
                  <img
                    src={choiceImage}
                    alt={`보기 ${choiceNum}`}
                    className="mb-2 max-h-[120px] rounded-lg"
                    loading="lazy"
                  />
                )}
                <span className={`text-[15px] leading-[22px] ${textClass}`}>
                  {choice}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Confirm button */}
      {!revealed && (
        <button
          onClick={handleReveal}
          disabled={selected === null}
          className={`flex w-full items-center justify-center gap-2 py-3.5 text-[15px] transition-all ${
            selected !== null
              ? "btn-amber"
              : "rounded-[14px] bg-slate-100 text-slate-400 cursor-not-allowed"
          }`}
        >
          <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span className="font-bold">정답 확인</span>
        </button>
      )}

      {/* Feedback + Explanation */}
      {revealed && (
        <div ref={feedbackRef} className="mt-3 space-y-3 animate-fade-in">
          {isCorrect ? (
            <div className="feedback-correct flex items-center gap-3">
              <div className="choice-badge choice-badge-correct">✓</div>
              <span className="text-sm font-bold text-emerald-700">정답입니다!</span>
            </div>
          ) : (
            <div className="feedback-wrong flex items-center gap-3">
              <div className="choice-badge choice-badge-wrong">✕</div>
              <span className="text-sm font-bold text-red-600">
                오답! 정답은 {question.correctAnswer}번
              </span>
            </div>
          )}

          {question.explanation && (
            <div className="explanation-box">
              <div className="flex items-center gap-1.5 mb-2.5">
                <span className="text-lg">💡</span>
                <span className="text-sm font-bold text-indigo-600">해설</span>
              </div>
              <p className="text-[13px] text-slate-700 leading-[22px] whitespace-pre-line">
                {question.explanation}
              </p>
            </div>
          )}

          <div className="ad-placeholder" data-ad-slot="explanation">
            광고 영역
          </div>
        </div>
      )}
    </div>
  );
}
