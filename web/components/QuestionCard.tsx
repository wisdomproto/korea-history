"use client";

import { useState, useRef, useEffect } from "react";
import { Question } from "@/lib/types";
import AdSlot from "@/components/AdSlot";

interface YouTubeData {
  videoId: string;
  startSeconds: number;
  channelName: string;
}

interface QuestionCardProps {
  question: Question;
  onAnswerSubmit?: (selectedAnswer: number, isCorrect: boolean) => void;
  youtube?: YouTubeData | null;
}

export default function QuestionCard({
  question,
  onAnswerSubmit,
  youtube,
}: QuestionCardProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const feedbackRef = useRef<HTMLDivElement>(null);

  const handleReveal = () => {
    if (selected === null) return;
    setRevealed(true);
    const isCorrect = selected === question.correctAnswer;
    if (isCorrect) setShowConfetti(true);
    onAnswerSubmit?.(selected, isCorrect);
  };

  useEffect(() => {
    if (revealed && feedbackRef.current) {
      setTimeout(() => {
        feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 200);
    }
  }, [revealed]);

  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => setShowConfetti(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showConfetti]);

  const isCorrect = selected === question.correctAnswer;

  return (
    <div className="relative">
      {/* Confetti effect */}
      {showConfetti && (
        <div className="confetti-container">
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} className="confetti-piece" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 0.5}s`,
              backgroundColor: ['#10B981', '#34D399', '#6EE7B7', '#FBBF24', '#F59E0B', '#818CF8', '#A78BFA'][i % 7],
            }} />
          ))}
        </div>
      )}

      {/* Question content */}
      <p className="mb-5 text-[15px] font-medium leading-[28px] text-slate-800">
        {question.content}
      </p>

      {/* Passage image */}
      {question.imageUrl && (
        <div className="passage-box mb-5">
          <img
            src={question.imageUrl}
            alt={`제${question.questionNumber}번 문제 자료`}
            className="w-full max-h-[400px] object-contain rounded-xl"
            loading="lazy"
          />
        </div>
      )}

      {/* Choices */}
      <div className="space-y-3 mb-5">
        {question.choices.map((choice, i) => {
          const choiceNum = i + 1;
          const isChoiceCorrect = choiceNum === question.correctAnswer;
          const isSelected = selected === choiceNum;
          const choiceImage = question.choiceImages?.[i];

          let btnClass = "choice-btn";
          let badgeClass = "choice-badge choice-badge-default";
          let badgeContent = <span>{choiceNum}</span>;
          let textClass = "text-slate-700";
          let extraClass = "";

          if (revealed) {
            if (isChoiceCorrect) {
              btnClass = "choice-btn choice-btn-correct";
              badgeClass = "choice-badge choice-badge-correct";
              badgeContent = <span className="text-lg">✓</span>;
              textClass = "text-emerald-700 font-bold";
              extraClass = "animate-pop";
            } else if (isSelected && !isChoiceCorrect) {
              btnClass = "choice-btn choice-btn-wrong";
              badgeClass = "choice-badge choice-badge-wrong";
              badgeContent = <span className="text-lg">✕</span>;
              textClass = "text-red-400";
              extraClass = "animate-shake";
            } else {
              btnClass = "choice-btn choice-btn-dimmed";
              badgeClass = "choice-badge choice-badge-default";
              textClass = "text-slate-400";
            }
          } else if (isSelected) {
            btnClass = "choice-btn choice-btn-selected";
            badgeClass = "choice-badge choice-badge-selected";
            badgeContent = <span className="text-lg">✓</span>;
            textClass = "text-emerald-700 font-semibold";
          }

          return (
            <button
              key={i}
              onClick={() => !revealed && setSelected(choiceNum)}
              disabled={revealed}
              className={`${btnClass} ${extraClass}`}
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
          className={`confirm-btn ${selected !== null ? "confirm-btn-active" : "confirm-btn-disabled"}`}
        >
          {selected !== null ? (
            <>
              <span className="confirm-btn-icon">👀</span>
              <span>정답 확인</span>
            </>
          ) : (
            <span>보기를 선택하세요</span>
          )}
        </button>
      )}

      {/* Feedback + Explanation */}
      {revealed && (
        <div ref={feedbackRef} className="mt-4 space-y-4">
          {isCorrect ? (
            <div className="feedback-correct">
              <div className="feedback-icon-correct">🎉</div>
              <div>
                <p className="text-base font-black text-emerald-700">정답!</p>
                <p className="text-xs text-emerald-500 mt-0.5">잘 알고 있네요</p>
              </div>
            </div>
          ) : (
            <div className="feedback-wrong">
              <div className="feedback-icon-wrong">😅</div>
              <div>
                <p className="text-base font-black text-red-600">오답</p>
                <p className="text-xs text-red-400 mt-0.5">
                  정답은 <span className="font-bold">{question.correctAnswer}번</span>
                </p>
              </div>
            </div>
          )}

          {question.explanation && (
            <div className="explanation-box">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center">
                  <span className="text-sm">💡</span>
                </div>
                <span className="text-sm font-black text-slate-800">해설</span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                {question.explanation}
              </p>
            </div>
          )}

          {/* Ad: after explanation, before youtube */}
          <AdSlot size="rectangle" slot={process.env.NEXT_PUBLIC_AD_SLOT_QUESTION} className="my-2" />

          {youtube && (
            <div className="rounded-2xl overflow-hidden border border-slate-200/60 bg-white shadow-md">
              <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100/50">
                <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/>
                  <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="white"/>
                </svg>
                <span className="text-sm font-bold text-slate-700">영상 해설</span>
                <span className="text-xs text-slate-400 ml-auto">{youtube.channelName}</span>
              </div>
              <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${youtube.videoId}?start=${youtube.startSeconds}&rel=0`}
                  title="영상 해설"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
