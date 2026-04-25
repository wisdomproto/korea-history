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
}

/**
 * Wraps QuestionCard and auto-saves wrong answers to localStorage.
 * Also marks the question as answered for the nav dot coloring.
 */
export default function QuestionWithTracking({ question, exam, youtube, relatedNotes }: Props) {
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
  };

  return <QuestionCard question={question} onAnswerSubmit={handleSubmit} youtube={youtube} relatedNotes={relatedNotes} />;
}
