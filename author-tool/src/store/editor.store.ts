import { create } from 'zustand';

type ActiveView = 'dashboard' | 'exam' | 'question' | 'generator' | 'card-news' | 'note-card-news' | 'card-news-gallery' | 'notes' | 'content' | 'notes-editor';
type ContentTab = 'base' | 'blog' | 'instagram' | 'threads' | 'longform' | 'shortform';
type SidebarSection = 'exam' | 'notes' | 'content' | null;

interface EditorStore {
  // Project
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;

  // Sidebar section (accordion)
  sidebarSection: SidebarSection;
  setSidebarSection: (section: SidebarSection) => void;

  // Exam
  selectedExamId: number | null;
  setSelectedExamId: (id: number | null) => void;
  editingQuestionId: number | null;
  setEditingQuestionId: (id: number | null) => void;

  // View
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;

  // Notes editor
  selectedNoteId: string | null;
  setSelectedNoteId: (id: string | null) => void;

  // Content system
  selectedContentId: string | null;
  setSelectedContentId: (id: string | null) => void;
  activeContentTab: ContentTab;
  setActiveContentTab: (tab: ContentTab) => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  // Project
  selectedProjectId: 'proj-default',
  setSelectedProjectId: (id) => set({ selectedProjectId: id, activeView: 'dashboard', selectedExamId: null, selectedContentId: null, selectedNoteId: null }),

  // Sidebar section
  sidebarSection: 'exam',
  setSidebarSection: (section) => set((s) => ({ sidebarSection: s.sidebarSection === section ? null : section })),

  // Exam
  selectedExamId: null,
  setSelectedExamId: (id) => set({ selectedExamId: id, activeView: id ? 'exam' : 'dashboard', editingQuestionId: null }),
  editingQuestionId: null,
  setEditingQuestionId: (id) => set({ editingQuestionId: id, activeView: id ? 'question' : 'exam' }),

  // View
  activeView: 'dashboard',
  setActiveView: (view) => set({ activeView: view }),

  // Notes editor
  selectedNoteId: null,
  setSelectedNoteId: (id) => set({ selectedNoteId: id, activeView: 'notes-editor' }),

  // Content system
  selectedContentId: null,
  setSelectedContentId: (id) => set({ selectedContentId: id, activeView: id ? 'content' : 'dashboard', activeContentTab: 'base' }),
  activeContentTab: 'base',
  setActiveContentTab: (tab) => set({ activeContentTab: tab }),
}));
