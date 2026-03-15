import { Exam, Question } from '../lib/types';
import exam77Data from './questions/exam-77.json';
import exam76Data from './questions/exam-76.json';
import exam75Data from './questions/exam-75.json';
import exam74Data from './questions/exam-74.json';
import exam73Data from './questions/exam-73.json';
import exam72Data from './questions/exam-72.json';
import exam71Data from './questions/exam-71.json';
import exam70Data from './questions/exam-70.json';
import exam69Data from './questions/exam-69.json';
import exam68Data from './questions/exam-68.json';
import exam67Data from './questions/exam-67.json';
import exam66Data from './questions/exam-66.json';
import exam65Data from './questions/exam-65.json';
import exam64Data from './questions/exam-64.json';
import exam63Data from './questions/exam-63.json';
import exam62Data from './questions/exam-62.json';
import exam61Data from './questions/exam-61.json';
import exam60Data from './questions/exam-60.json';
import exam59Data from './questions/exam-59.json';
import exam58Data from './questions/exam-58.json';
import exam57Data from './questions/exam-57.json';
import exam56Data from './questions/exam-56.json';
import exam55Data from './questions/exam-55.json';
import exam54Data from './questions/exam-54.json';
import exam53Data from './questions/exam-53.json';
import exam52Data from './questions/exam-52.json';
import exam51Data from './questions/exam-51.json';
import exam50Data from './questions/exam-50.json';
import exam49Data from './questions/exam-49.json';
import exam48Data from './questions/exam-48.json';
import exam47Data from './questions/exam-47.json';
import exam46Data from './questions/exam-46.json';
import exam45Data from './questions/exam-45.json';
import exam44Data from './questions/exam-44.json';
import exam43Data from './questions/exam-43.json';
import exam42Data from './questions/exam-42.json';
import exam41Data from './questions/exam-41.json';
import exam40Data from './questions/exam-40.json';

// Auto-generated — do not edit manually
// 회차 목록 (최신순)
export const EXAMS: Exam[] = [
  exam77Data.exam as Exam,
  exam76Data.exam as Exam,
  exam75Data.exam as Exam,
  exam74Data.exam as Exam,
  exam73Data.exam as Exam,
  exam72Data.exam as Exam,
  exam71Data.exam as Exam,
  exam70Data.exam as Exam,
  exam69Data.exam as Exam,
  exam68Data.exam as Exam,
  exam67Data.exam as Exam,
  exam66Data.exam as Exam,
  exam65Data.exam as Exam,
  exam64Data.exam as Exam,
  exam63Data.exam as Exam,
  exam62Data.exam as Exam,
  exam61Data.exam as Exam,
  exam60Data.exam as Exam,
  exam59Data.exam as Exam,
  exam58Data.exam as Exam,
  exam57Data.exam as Exam,
  exam56Data.exam as Exam,
  exam55Data.exam as Exam,
  exam54Data.exam as Exam,
  exam53Data.exam as Exam,
  exam52Data.exam as Exam,
  exam51Data.exam as Exam,
  exam50Data.exam as Exam,
  exam49Data.exam as Exam,
  exam48Data.exam as Exam,
  exam47Data.exam as Exam,
  exam46Data.exam as Exam,
  exam45Data.exam as Exam,
  exam44Data.exam as Exam,
  exam43Data.exam as Exam,
  exam42Data.exam as Exam,
  exam41Data.exam as Exam,
  exam40Data.exam as Exam,
];

const questionsMap: Record<number, Question[]> = {
  [exam77Data.exam.id]: exam77Data.questions as Question[],
  [exam76Data.exam.id]: exam76Data.questions as Question[],
  [exam75Data.exam.id]: exam75Data.questions as Question[],
  [exam74Data.exam.id]: exam74Data.questions as Question[],
  [exam73Data.exam.id]: exam73Data.questions as Question[],
  [exam72Data.exam.id]: exam72Data.questions as Question[],
  [exam71Data.exam.id]: exam71Data.questions as Question[],
  [exam70Data.exam.id]: exam70Data.questions as Question[],
  [exam69Data.exam.id]: exam69Data.questions as Question[],
  [exam68Data.exam.id]: exam68Data.questions as Question[],
  [exam67Data.exam.id]: exam67Data.questions as Question[],
  [exam66Data.exam.id]: exam66Data.questions as Question[],
  [exam65Data.exam.id]: exam65Data.questions as Question[],
  [exam64Data.exam.id]: exam64Data.questions as Question[],
  [exam63Data.exam.id]: exam63Data.questions as Question[],
  [exam62Data.exam.id]: exam62Data.questions as Question[],
  [exam61Data.exam.id]: exam61Data.questions as Question[],
  [exam60Data.exam.id]: exam60Data.questions as Question[],
  [exam59Data.exam.id]: exam59Data.questions as Question[],
  [exam58Data.exam.id]: exam58Data.questions as Question[],
  [exam57Data.exam.id]: exam57Data.questions as Question[],
  [exam56Data.exam.id]: exam56Data.questions as Question[],
  [exam55Data.exam.id]: exam55Data.questions as Question[],
  [exam54Data.exam.id]: exam54Data.questions as Question[],
  [exam53Data.exam.id]: exam53Data.questions as Question[],
  [exam52Data.exam.id]: exam52Data.questions as Question[],
  [exam51Data.exam.id]: exam51Data.questions as Question[],
  [exam50Data.exam.id]: exam50Data.questions as Question[],
  [exam49Data.exam.id]: exam49Data.questions as Question[],
  [exam48Data.exam.id]: exam48Data.questions as Question[],
  [exam47Data.exam.id]: exam47Data.questions as Question[],
  [exam46Data.exam.id]: exam46Data.questions as Question[],
  [exam45Data.exam.id]: exam45Data.questions as Question[],
  [exam44Data.exam.id]: exam44Data.questions as Question[],
  [exam43Data.exam.id]: exam43Data.questions as Question[],
  [exam42Data.exam.id]: exam42Data.questions as Question[],
  [exam41Data.exam.id]: exam41Data.questions as Question[],
  [exam40Data.exam.id]: exam40Data.questions as Question[],
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
