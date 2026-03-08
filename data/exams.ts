import { Exam, Question } from '../lib/types';
import exam1Data from './questions/exam-1.json';
import exam69Data from './questions/exam-69.json';
import exam70Data from './questions/exam-70.json';
import exam71Data from './questions/exam-71.json';
import exam72Data from './questions/exam-72.json';
import exam73Data from './questions/exam-73.json';
import exam75Data from './questions/exam-75.json';

// 회차 목록 (최신순)
export const EXAMS: Exam[] = [
  exam75Data.exam as Exam,
  exam73Data.exam as Exam,
  exam72Data.exam as Exam,
  exam71Data.exam as Exam,
  exam70Data.exam as Exam,
  exam69Data.exam as Exam,
  exam1Data.exam as Exam,
];

// 회차별 문제 데이터 (key = exam.id)
const questionsMap: Record<number, Question[]> = {
  [exam75Data.exam.id]: exam75Data.questions as Question[],
  [exam73Data.exam.id]: exam73Data.questions as Question[],
  [exam72Data.exam.id]: exam72Data.questions as Question[],
  [exam71Data.exam.id]: exam71Data.questions as Question[],
  [exam70Data.exam.id]: exam70Data.questions as Question[],
  [exam69Data.exam.id]: exam69Data.questions as Question[],
  [exam1Data.exam.id]: exam1Data.questions as Question[],
};

export function getExamById(examId: number): Exam | undefined {
  return EXAMS.find((e) => e.id === examId);
}

export function getQuestionsByExamId(examId: number): Question[] {
  return questionsMap[examId] || [];
}

export function getAllQuestions(): Question[] {
  return Object.values(questionsMap).flat();
}

export function getQuestionById(questionId: number): Question | undefined {
  for (const questions of Object.values(questionsMap)) {
    const found = questions.find((q) => q.id === questionId);
    if (found) return found;
  }
  return undefined;
}
