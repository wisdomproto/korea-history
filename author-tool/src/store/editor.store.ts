import { create } from 'zustand';

export type ActiveView ='analytics' | 'dashboard' | 'exam' | 'question' | 'generator' | 'card-news' | 'note-card-news' | 'card-news-gallery' | 'notes' | 'content' | 'notes-editor' | 'cbt-exam' | 'summary-notes-editor' | 'marketing';
type ContentTab = 'base' | 'blog' | 'wordpress' | 'instagram' | 'threads' | 'longform' | 'shortform';
type SidebarSection = 'exam' | 'notes' | 'marketing' | null;
export type MarketingSubmenu =
  | 'settings'
  | 'ideas'
  | 'content'
  | 'publish'
  | 'monitoring'
  | 'ads'
  | 'site-analytics'
  | 'channel-analytics'
  | 'competitor'
  | 'strategy';

interface EditorStore {
  // Sidebar collapsed
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;

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

  // CBT exam
  selectedCbtExamId: string | null;
  setSelectedCbtExamId: (id: string | null) => void;

  // Marketing
  marketingSubmenu: MarketingSubmenu;
  setMarketingSubmenu: (submenu: MarketingSubmenu) => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  // Sidebar collapsed
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  // Project
  selectedProjectId: 'proj-default',
  setSelectedProjectId: (id) => set({ selectedProjectId: id, activeView: 'dashboard', selectedExamId: null, selectedContentId: null, selectedNoteId: null, sidebarSection: 'exam', selectedCbtExamId: null }),

  // Sidebar section
  sidebarSection: 'exam',
  setSidebarSection: (section) => set({ sidebarSection: section }),

  // Exam
  selectedExamId: null,
  setSelectedExamId: (id) => set({ selectedExamId: id, activeView: id ? 'exam' : 'dashboard', editingQuestionId: null, selectedCbtExamId: null }),
  editingQuestionId: null,
  setEditingQuestionId: (id) => set({ editingQuestionId: id, activeView: id ? 'question' : 'exam' }),

  // View
  activeView: 'analytics',
  setActiveView: (view) => set({ activeView: view }),

  // Notes editor
  selectedNoteId: null,
  setSelectedNoteId: (id) => set({ selectedNoteId: id, activeView: 'notes-editor' }),

  // Content system
  selectedContentId: null,
  setSelectedContentId: (id) => set((s) => {
    // If already in marketing workspace, stay there; otherwise use legacy direct view.
    const stayInMarketing = s.activeView === 'marketing';
    return {
      selectedContentId: id,
      activeView: stayInMarketing ? 'marketing' : id ? 'content' : 'dashboard',
      activeContentTab: 'base',
    };
  }),
  activeContentTab: 'base',
  setActiveContentTab: (tab) => set({ activeContentTab: tab }),

  // CBT exam
  selectedCbtExamId: null,
  setSelectedCbtExamId: (id) => set({ selectedCbtExamId: id, activeView: id ? 'cbt-exam' : 'dashboard', selectedExamId: null, editingQuestionId: null }),

  // Marketing
  marketingSubmenu: 'content',
  setMarketingSubmenu: (submenu) => set({ marketingSubmenu: submenu, activeView: 'marketing' }),
}));
