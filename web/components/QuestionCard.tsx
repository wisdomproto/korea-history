"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Question } from "@/lib/types";
import AdSlot from "@/components/AdSlot";
import YouTubeEmbed from "@/components/YouTubeEmbed";
import { playSelectSound, playCorrectSound, playWrongSound } from "@/lib/sounds";

export interface RelatedNoteLink {
  id: string;
  title: string;
  eraLabel: string;
  sectionId: string;
  /** Optional override URL. 한능검은 /notes/{id} 기본, CBT 단권화 단원은 /civil-notes/{slug}/{topicId} 명시 */
  href?: string;
}

interface YouTubeData {
  videoId: string;
  startSeconds: number;
  channelName: string;
}

interface QuestionCardProps {
  question: Question;
  onAnswerSubmit?: (selectedAnswer: number, isCorrect: boolean) => void;
  youtube?: YouTubeData | null;
  relatedNotes?: RelatedNoteLink[];
  /** Hide the in-card related notes link list (parent uses a drawer/panel instead) */
  hideRelatedNotes?: boolean;
  /** Hide the in-card YouTube embed (parent renders it elsewhere, e.g. page bottom) */
  hideYouTubeInCard?: boolean;
}

export default function QuestionCard({
  question,
  onAnswerSubmit,
  youtube,
  relatedNotes,
  hideRelatedNotes,
  hideYouTubeInCard,
}: QuestionCardProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showFlash, setShowFlash] = useState<"correct" | "wrong" | null>(null);
  const [showScorePopup, setShowScorePopup] = useState(false);
  const feedbackRef = useRef<HTMLDivElement>(null);

  const handleSelect = (choiceNum: number) => {
    if (revealed) return;
    setSelected(choiceNum);
    playSelectSound();
  };

  const handleReveal = () => {
    if (selected === null) return;
    setRevealed(true);
    const isCorrect = selected === question.correctAnswer;
    if (isCorrect) {
      setShowConfetti(true);
      setShowScorePopup(true);
      setShowFlash("correct");
      playCorrectSound();
    } else {
      setShowFlash("wrong");
      playWrongSound();
    }
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

  useEffect(() => {
    if (showFlash) {
      const timer = setTimeout(() => setShowFlash(null), 500);
      return () => clearTimeout(timer);
    }
  }, [showFlash]);

  useEffect(() => {
    if (showScorePopup) {
      const timer = setTimeout(() => setShowScorePopup(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [showScorePopup]);

  const isCorrect = selected === question.correctAnswer;

  return (
    <div className="relative">
      {/* Screen flash overlay */}
      {showFlash && (
        <div className={`answer-flash ${showFlash === "correct" ? "answer-flash-correct" : "answer-flash-wrong"}`} />
      )}

      {/* Score popup */}
      {showScorePopup && (
        <div className="score-popup">
          <span>+{question.points || 2}점</span>
        </div>
      )}

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

      {/* Sparkle burst on correct */}
      {showConfetti && (
        <div className="sparkle-container">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="sparkle" style={{
              '--angle': `${i * 45}deg`,
            } as React.CSSProperties} />
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
              onClick={() => handleSelect(choiceNum)}
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

          {/* Related notes — hidden when parent provides a drawer/panel for the same data */}
          {!hideRelatedNotes && relatedNotes && relatedNotes.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 px-1">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0">
                  <span className="text-xs text-white">📒</span>
                </div>
                <span className="text-sm font-bold text-slate-700">관련 요약노트</span>
              </div>
              {relatedNotes.map((note) => (
                <Link
                  key={note.id}
                  href={note.href ?? `/notes/${note.id}`}
                  className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border border-emerald-200/60 bg-gradient-to-r from-emerald-50/80 to-teal-50/80 hover:from-emerald-100 hover:to-teal-100 transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-emerald-700 line-clamp-1">{note.title}</span>
                    <span className="text-[11px] text-emerald-500 block">{note.eraLabel}</span>
                  </div>
                  <svg className="w-4 h-4 text-emerald-400 shrink-0 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          )}

          {/* Ad: after explanation, before youtube */}
          <AdSlot size="rectangle" slot={process.env.NEXT_PUBLIC_AD_SLOT_QUESTION} className="my-2" />

          {!hideYouTubeInCard && youtube && (
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
                <YouTubeEmbed
                  className="absolute inset-0 w-full h-full"
                  videoId={youtube.videoId}
                  startSeconds={youtube.startSeconds}
                  title="영상 해설"
                  context={{
                    surface: "question",
                    question_id: question.id,
                    exam_id: question.examId,
                    question_number: question.questionNumber,
                    channel: youtube.channelName,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
