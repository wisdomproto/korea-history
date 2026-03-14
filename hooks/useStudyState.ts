import { useState, useCallback } from 'react';
import { Question } from '@/lib/types';

interface UseStudyStateOptions {
  /** Called when the user answers correctly (e.g., resolve a wrong note) */
  onCorrect?: (question: Question) => void;
}

export function useStudyState(options: UseStudyStateOptions = {}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [completed, setCompleted] = useState(false);

  const current = questions[currentIndex] as Question | undefined;

  const handleSelect = useCallback(
    (choice: number) => {
      if (showResult) return;
      setSelectedAnswer(choice);
    },
    [showResult],
  );

  /** Reveal the correct answer and show feedback */
  const handleConfirm = useCallback(() => {
    if (showResult || selectedAnswer == null) return;
    setShowResult(true);
    if (current && selectedAnswer === current.correctAnswer) {
      setCorrectCount((c) => c + 1);
      options.onCorrect?.(current);
    }
  }, [showResult, selectedAnswer, current, options.onCorrect]);

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setCompleted(true);
    }
  }, [currentIndex, questions.length]);

  /** Initialize or restart study with a new set of questions */
  const startStudy = useCallback((qs: Question[]) => {
    setQuestions(qs);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setCorrectCount(0);
    setCompleted(false);
  }, []);

  return {
    questions,
    current,
    currentIndex,
    selectedAnswer,
    showResult,
    correctCount,
    completed,
    handleSelect,
    handleConfirm,
    handleNext,
    startStudy,
  };
}
