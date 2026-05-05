"use client";

import { Question, Exam } from "@/lib/types";
import { handleAnswerResult } from "@/lib/wrong-answers";
import { useCurrentExamSlug, useCurrentSubjectSlug } from "@/lib/exam-context";
import { markAnswered } from "./QuestionNav";
import QuestionCard, { type RelatedNoteLink } from "./QuestionCard";

interface YouTubeData {
  videoId: string;
  startSeconds: number;
  channelName: string;
}

interface Props {
  question: Question;
  exam: Exam;
  youtube?: YouTubeData | null;
  relatedNotes?: RelatedNoteLink[];
  /** Called once the user reveals the answer (any choice). Used by side panels to show post-answer content. */
  onAnswered?: () => void;
  /** Hide the in-card related notes link list (parent uses a drawer/panel instead) */
  hideRelatedNotes?: boolean;
  /** Hide the in-card YouTube embed (parent renders it elsewhere, e.g. page bottom) */
  hideYouTubeInCard?: boolean;
}

/**
 * Wraps QuestionCard and auto-saves wrong answers to localStorage.
 * Also marks the question as answered for the nav dot coloring.
 */
export default function QuestionWithTracking({ question, exam, youtube, relatedNotes, onAnswered, hideRelatedNotes, hideYouTubeInCard }: Props) {
  const examSlug = useCurrentExamSlug();
  const subjectSlug = useCurrentSubjectSlug();
  const handleSubmit = (selectedAnswer: number, isCorrect: boolean) => {
    // Save wrong answer / auto-resolve (per-(exam,subject) scoped)
    handleAnswerResult(
      question.id,
      exam.id,
      exam.examNumber,
      question.questionNumber,
      selectedAnswer,
      question.correctAnswer,
      isCorrect,
      question.content,
      question.era,
      question.category,
      question.points,
      examSlug,
      subjectSlug
    );

    // Mark answered for nav dot
    markAnswered(exam.examNumber, question.questionNumber);

    // Notify QuestionNav to re-render
    window.dispatchEvent(new Event("answer-revealed"));

    // Notify parent (e.g. side panel)
    onAnswered?.();
  };

  return <QuestionCard question={question} onAnswerSubmit={handleSubmit} youtube={youtube} relatedNotes={relatedNotes} hideRelatedNotes={hideRelatedNotes} hideYouTubeInCard={hideYouTubeInCard} />;
}
