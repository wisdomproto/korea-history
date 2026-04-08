import { useExams } from '@/features/exam/hooks/useExams';
import { useNotes } from '@/features/notes/hooks/useNotes';
import { useEditorStore } from '@/store/editor.store';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/axios';
import { useState } from 'react';
import { useContents } from '@/features/content/hooks/useContent';
import { examApi } from '@/features/exam/api/exam.api';
import { ProjectSelector } from './sidebar/ProjectSelector';
import { ExamList } from './sidebar/ExamList';
import { CbtExamList } from './sidebar/CbtExamList';
import { NotesList } from './sidebar/NotesList';
import { ContentList } from './sidebar/ContentList';
export { ERA_COLORS } from './sidebar/NotesList';

interface Project {
  id: string;
  name: string;
  icon: string;
  type?: 'korean-history' | 'cbt';
  categoryCode?: string;
  examCount?: number;
  questionCount?: number;
}

interface SidebarProps {
  onCreateExam: () => void;
  onDeleteExam: (id: number) => void;
}

export function Sidebar({ onCreateExam, onDeleteExam }: SidebarProps) {
  const {
    selectedExamId, setSelectedExamId,
    selectedContentId, setSelectedContentId,
    selectedProjectId, setSelectedProjectId,
    sidebarSection, setSidebarSection,
    selectedNoteId, setSelectedNoteId,
    activeView, setActiveView,
    sidebarCollapsed, toggleSidebar,
    selectedCbtExamId, setSelectedCbtExamId,
  } = useEditorStore();

  const { data: exams } = useExams();
  const { data: notes } = useNotes();
  const { data: contents } = useContents(selectedProjectId);

  const { data: projects } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => apiGet<Project[]>('/projects'),
  });

  const selectedProject = projects?.find((p) => p.id === selectedProjectId) ?? { id: 'proj-default', name: '기본 프로젝트', icon: '📂' };
  const currentProject = projects?.find((p) => p.id === selectedProjectId);
  const isCbt = currentProject?.type === 'cbt';

  // ─── Collapsed sidebar ───
  if (sidebarCollapsed) {
    return (
      <aside className="flex h-screen w-12 flex-col border-r bg-white shrink-0">
        <div className="flex flex-col items-center py-3 gap-2">
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            title="사이드바 펼치기"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div className="flex flex-col items-center gap-1 border-t py-2">
          <button
            onClick={() => { setActiveView('analytics'); }}
            className={`p-1.5 rounded-lg text-sm transition-colors ${activeView === 'analytics' ? 'bg-emerald-100' : 'hover:bg-gray-100'}`}
            title="사이트 분석"
          >📊</button>
          <button
            onClick={() => { setSidebarSection('exam'); toggleSidebar(); }}
            className={`p-1.5 rounded-lg text-sm transition-colors ${sidebarSection === 'exam' ? 'bg-emerald-100' : 'hover:bg-gray-100'}`}
            title="시험"
          >📋</button>
          <button
            onClick={() => { setSidebarSection('notes'); toggleSidebar(); }}
            className={`p-1.5 rounded-lg text-sm transition-colors ${sidebarSection === 'notes' ? 'bg-emerald-100' : 'hover:bg-gray-100'}`}
            title="노트"
          >📝</button>
          <button
            onClick={() => { setSidebarSection('content'); toggleSidebar(); }}
            className={`p-1.5 rounded-lg text-sm transition-colors ${sidebarSection === 'content' ? 'bg-emerald-100' : 'hover:bg-gray-100'}`}
            title="컨텐츠"
          >✏️</button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-screen w-72 flex-col border-r bg-white shrink-0">
      {/* ═══ 1. Header ═══ */}
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <h1
            className="cursor-pointer text-lg font-bold text-primary-700"
            onClick={() => { setSelectedExamId(null); setActiveView('dashboard'); }}
          >
            기출노트 저작도구
          </h1>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              title="사이드바 접기"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setActiveView('analytics')}
              className={`p-1.5 rounded-lg text-sm transition-colors ${
                activeView === 'analytics' ? 'bg-emerald-100 text-emerald-700' : 'hover:bg-gray-100 text-gray-500'
              }`}
              title="사이트 분석"
            >
              📊
            </button>
            <a
              href={window.location.hostname === 'localhost' ? 'http://localhost:8081' : 'https://gcnote.co.kr'}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-primary-100 hover:text-primary-700"
              title="웹사이트 열기"
            >
              사이트 &rarr;
            </a>
          </div>
        </div>
      </div>

      {/* ═══ 2. Projects + Tab Content ═══ */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <ProjectSelector
          selectedProjectId={selectedProjectId}
          setSelectedProjectId={setSelectedProjectId}
        >
          {({ project }) => {
            const projectIsCbt = project.type === 'cbt';
            return (
              <div className="flex flex-col">
                {/* Tabs */}
                <div className="flex border-b border-t bg-white">
                  {[
                    { key: 'exam' as const, label: '📋 시험', count: exams?.length },
                    { key: 'notes' as const, label: '📝 노트', count: notes?.length },
                    { key: 'content' as const, label: '✏️ 컨텐츠', count: contents?.length },
                  ].map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setSidebarSection(t.key)}
                      className={`flex-1 py-2 text-[11px] font-semibold transition-colors ${
                        sidebarSection === t.key
                          ? 'border-b-2 border-emerald-500 text-emerald-700'
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {t.label} <span className="text-[9px] font-normal">{t.count ?? ''}</span>
                    </button>
                  ))}
                </div>

                {/* ─── 📋 시험 Tab ─── */}
                {sidebarSection === 'exam' && (
                  projectIsCbt ? (
                    <CbtExamList
                      categoryCode={project.categoryCode}
                      selectedCbtExamId={selectedCbtExamId}
                      setSelectedCbtExamId={setSelectedCbtExamId}
                    />
                  ) : (
                    <ExamList
                      selectedExamId={selectedExamId}
                      setSelectedExamId={setSelectedExamId}
                      setActiveView={setActiveView}
                      onCreateExam={onCreateExam}
                      onDeleteExam={onDeleteExam}
                    />
                  )
                )}

                {/* ─── 📝 요약노트 Tab ─── */}
                {sidebarSection === 'notes' && (
                  <NotesList
                    isCbt={projectIsCbt}
                    categoryCode={project.categoryCode}
                    selectedNoteId={selectedNoteId}
                    setSelectedNoteId={setSelectedNoteId}
                    setActiveView={setActiveView}
                  />
                )}

                {/* ─── ✏️ 컨텐츠 Tab ─── */}
                {sidebarSection === 'content' && (
                  <ContentList
                    selectedProjectId={selectedProjectId}
                    selectedContentId={selectedContentId}
                    setSelectedContentId={setSelectedContentId}
                  />
                )}
              </div>
            );
          }}
        </ProjectSelector>
      </div>

      {/* ═══ 3. Footer ═══ */}
      <div className="border-t bg-gray-50 px-4 py-2">
        <div className="flex items-center justify-between">
          <span className="truncate text-xs text-gray-500">
            {selectedProject.icon} {selectedProject.name}
          </span>
          <DeployButton />
        </div>
      </div>
    </aside>
  );
}

function DeployButton() {
  const [status, setStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle');

  const handleDeploy = async () => {
    if (status === 'deploying') return;
    setStatus('deploying');
    try { await examApi.deploy(); setStatus('success'); setTimeout(() => setStatus('idle'), 3000); }
    catch { setStatus('error'); setTimeout(() => setStatus('idle'), 3000); }
  };

  return (
    <button
      onClick={handleDeploy}
      disabled={status === 'deploying'}
      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
        status === 'deploying' ? 'bg-amber-100 text-amber-700 cursor-wait' :
        status === 'success' ? 'bg-green-100 text-green-700' :
        status === 'error' ? 'bg-red-100 text-red-700' :
        'bg-primary-100 text-primary-700 hover:bg-primary-200'
      }`}
      title="웹사이트에 최신 데이터 배포"
    >
      {status === 'deploying' ? '배포 중...' :
       status === 'success' ? '배포 완료 ✓' :
       status === 'error' ? '배포 실패' :
       '웹 배포'}
    </button>
  );
}
