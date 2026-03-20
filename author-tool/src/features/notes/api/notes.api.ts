import { apiGet, apiPut } from '@/lib/axios';

export interface NoteIndex {
  id: string;
  title: string;
  era: string;
  eraLabel: string;
  sectionId: string;
  order: number;
  questionCount: number;
}

export interface Note extends NoteIndex {
  content: string;
  relatedKeywords: string[];
  relatedQuestionIds: number[];
}

export interface NotesStats {
  totalNotes: number;
  totalRelatedQuestions: number;
  bySectionId: Record<string, number>;
}

export const notesApi = {
  getAll: () => apiGet<NoteIndex[]>('/notes'),
  getById: (id: string) => apiGet<Note>(`/notes/${id}`),
  update: (id: string, data: Partial<Note>) => apiPut<Note>(`/notes/${id}`, data),
  getStats: () => apiGet<NotesStats>('/notes/stats'),
};
