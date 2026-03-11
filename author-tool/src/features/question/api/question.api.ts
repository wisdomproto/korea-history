import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/axios';
import type { Question } from '@/lib/types';

export const questionApi = {
  listByExam: (examId: number) => apiGet<Question[]>(`/questions?examId=${examId}`),
  create: (examId: number, question: Partial<Question>) => apiPost<Question>('/questions', { examId, ...question }),
  update: (id: number, updates: Partial<Question>) => apiPut<Question>(`/questions/${id}`, updates),
  delete: (id: number) => apiDelete<null>(`/questions/${id}`),
  reorder: (examId: number, questionIds: number[]) => apiPost<Question[]>('/questions/reorder', { examId, questionIds }),
  addBatch: (examId: number, questions: Partial<Question>[]) => apiPost<Question[]>('/questions/batch', { examId, questions }),
  bulkUpdateAnswers: (examId: number, answers: { questionNumber: number; correctAnswer: number; points?: number }[]) =>
    apiPut<Question[]>('/questions/bulk-answers', { examId, answers }),
  bulkUpdateExplanations: (examId: number, explanations: { questionNumber: number; explanation: string }[]) =>
    apiPut<Question[]>('/questions/bulk-explanations', { examId, explanations }),
};
