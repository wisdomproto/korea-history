import { apiGet, apiPut } from '@/lib/axios';

export interface CbtCategory {
  name: string;
  code: string;
  url: string;
  examCount: number;
  questionCount: number;
}

export interface CbtExamMeta {
  exam_id: string;
  label: string;
  date: string;
  question_count: number;
}

export interface CbtQuestionImage {
  url: string;
  local_path: string | null;
}

export interface CbtChoice {
  number: number;
  text: string;
  is_correct: boolean;
  images: CbtQuestionImage[] | null;
}

export interface CbtQuestion {
  question_id: string;
  number: number;
  text: string;
  images: CbtQuestionImage[] | null;
  choices: CbtChoice[];
  correct_answer: number;
  answer_rate: number | null;
  explanation: string | null;
}

export interface CbtExamData {
  exam_id: string;
  label: string;
  date: string;
  url: string;
  question_count: number;
  questions: CbtQuestion[];
}

export const cbtApi = {
  getCategories: () => apiGet<CbtCategory[]>('/cbt/categories'),
  getExams: (code: string) => apiGet<CbtExamMeta[]>(`/cbt/categories/${code}/exams`),
  getExam: (code: string, examId: string) => apiGet<CbtExamData>(`/cbt/categories/${code}/exams/${examId}`),
  updateQuestion: (code: string, examId: string, questionId: string, updates: any) =>
    apiPut(`/cbt/categories/${code}/exams/${examId}/questions/${questionId}`, updates),
};
