import { create } from 'zustand';

type ActiveView = 'dashboard' | 'exam' | 'question' | 'generator';

interface EditorStore {
  selectedExamId: number | null;
  setSelectedExamId: (id: number | null) => void;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  editingQuestionId: number | null;
  setEditingQuestionId: (id: number | null) => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  selectedExamId: null,
  setSelectedExamId: (id) => set({ selectedExamId: id, activeView: id ? 'exam' : 'dashboard', editingQuestionId: null }),
  activeView: 'dashboard',
  setActiveView: (view) => set({ activeView: view }),
  editingQuestionId: null,
  setEditingQuestionId: (id) => set({ editingQuestionId: id, activeView: id ? 'question' : 'exam' }),
}));
