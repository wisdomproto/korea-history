import { useState, useCallback, useEffect, useRef } from 'react';
import { Question, UserAnswer } from '@/lib/types';
import { saveExamState, SavedExamState } from '@/lib/storage';

interface UseExamOptions {
  initialAnswers?: UserAnswer[];
  initialIndex?: number;
}

export function useExam(questions: Question[], options?: UseExamOptions) {
  const [currentIndex, setCurrentIndex] = useState(options?.initialIndex ?? 0);
  const [answers, setAnswers] = useState<UserAnswer[]>(
    options?.initialAnswers ??
    questions.map((q) => ({
      questionId: q.id,
      questionNumber: q.questionNumber,
      selectedAnswer: null,
    }))
  );

  const examIdRef = useRef<number | null>(null);
  const answersRef = useRef(answers);
  const indexRef = useRef(currentIndex);

  answersRef.current = answers;
  indexRef.current = currentIndex;

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;

  const selectAnswer = useCallback((choiceNumber: number) => {
    setAnswers((prev) =>
      prev.map((a, i) =>
        i === currentIndex ? { ...a, selectedAnswer: choiceNumber } : a
      )
    );
  }, [currentIndex]);

  const goToQuestion = useCallback((index: number) => {
    if (index >= 0 && index < totalQuestions) {
      setCurrentIndex(index);
    }
  }, [totalQuestions]);

  const goNext = useCallback(() => {
    goToQuestion(currentIndex + 1);
  }, [currentIndex, goToQuestion]);

  const goPrev = useCallback(() => {
    goToQuestion(currentIndex - 1);
  }, [currentIndex, goToQuestion]);

  const currentAnswer = answers[currentIndex]?.selectedAnswer ?? null;
  const answeredCount = answers.filter((a) => a.selectedAnswer !== null).length;

  const submitExam = useCallback(() => {
    return answers.map((a) => {
      const question = questions.find((q) => q.id === a.questionId);
      return {
        ...a,
        isCorrect: question ? a.selectedAnswer === question.correctAnswer : false,
      };
    });
  }, [answers, questions]);

  // 자동 저장 (US-08): 답안 변경 시마다 저장
  const setExamId = useCallback((id: number) => {
    examIdRef.current = id;
  }, []);

  const saveState = useCallback(async (remainingSeconds: number) => {
    if (!examIdRef.current) return;
    const state: SavedExamState = {
      examId: examIdRef.current,
      answers: answersRef.current.map((a) => ({
        questionId: a.questionId,
        questionNumber: a.questionNumber,
        selectedAnswer: a.selectedAnswer,
      })),
      currentIndex: indexRef.current,
      remainingSeconds,
      savedAt: new Date().toISOString(),
    };
    await saveExamState(state);
  }, []);

  return {
    currentQuestion,
    currentIndex,
    totalQuestions,
    currentAnswer,
    answers,
    answeredCount,
    selectAnswer,
    goNext,
    goPrev,
    goToQuestion,
    submitExam,
    setExamId,
    saveState,
  };
}
