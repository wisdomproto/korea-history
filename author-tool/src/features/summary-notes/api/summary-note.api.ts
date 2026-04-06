import { apiGet, apiPut } from '@/lib/axios';

export interface SummaryNoteMeta {
  id: string;
  title: string;
  questionCount: number;
  topicCount: number;
  createdAt: string;
}

export interface SummaryNote {
  id: string;
  categoryCode: string;
  title: string;
  examIds: string[];
  questionCount: number;
  topicCount: number;
  html: string;
  createdAt: string;
  updatedAt: string;
}

export const summaryNoteApi = {
  list: (categoryCode: string) => apiGet<SummaryNoteMeta[]>(`/summary-notes/${categoryCode}`),
  get: (categoryCode: string, noteId: string) => apiGet<SummaryNote>(`/summary-notes/${categoryCode}/${noteId}`),
  update: (categoryCode: string, noteId: string, data: Partial<SummaryNote>) =>
    apiPut<SummaryNote>(`/summary-notes/${categoryCode}/${noteId}`, data),
};
