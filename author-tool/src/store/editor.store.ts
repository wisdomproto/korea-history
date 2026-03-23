import { create } from 'zustand';

type ActiveView = 'dashboard' | 'exam' | 'question' | 'generator' | 'card-news' | 'note-card-news' | 'card-news-gallery' | 'notes' | 'content';
type ContentTab = 'base' | 'blog' | 'instagram' | 'threads' | 'longform' | 'shortform';

interface EditorStore {
  selectedExamId: number | null;
  setSelectedExamId: (id: number | null) => void;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  editingQuestionId: number | null;
  setEditingQuestionId: (id: number | null) => void;

  // Content system
  selectedContentId: string | null;
  setSelectedContentId: (id: string | null) => void;
  activeContentTab: ContentTab;
  setActiveContentTab: (tab: ContentTab) => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  selectedExamId: null,
  setSelectedExamId: (id) => set({ selectedExamId: id, activeView: id ? 'exam' : 'dashboard', editingQuestionId: null }),
  activeView: 'dashboard',
  setActiveView: (view) => set({ activeView: view }),
  editingQuestionId: null,
  setEditingQuestionId: (id) => set({ editingQuestionId: id, activeView: id ? 'question' : 'exam' }),

  // Content system
  selectedContentId: null,
  setSelectedContentId: (id) => set({ selectedContentId: id, activeView: id ? 'content' : 'dashboard', activeContentTab: 'base' }),
  activeContentTab: 'base',
  setActiveContentTab: (tab) => set({ activeContentTab: tab }),
}));
