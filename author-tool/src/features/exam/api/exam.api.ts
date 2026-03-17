import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/axios';
import type { ExamWithCount, ExamFile, Exam } from '@/lib/types';

export const examApi = {
  list: () => apiGet<ExamWithCount[]>('/exams'),
  getById: (id: number) => apiGet<ExamFile>(`/exams/${id}`),
  create: (exam: Omit<Exam, 'id'>) => apiPost<ExamFile>('/exams', exam),
  update: (id: number, updates: Partial<Exam>) => apiPut<ExamFile>(`/exams/${id}`, updates),
  delete: (id: number) => apiDelete<null>(`/exams/${id}`),
  reorder: (examIds: number[]) => apiPost<null>('/exams/reorder', { examIds }),
  deploy: () => apiPost<{ message: string; vercel: any }>('/exams/deploy', {}),
};
