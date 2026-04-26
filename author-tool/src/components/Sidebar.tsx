import { useExams } from '@/features/exam/hooks/useExams';
import { useNotes } from '@/features/notes/hooks/useNotes';
import { useEditorStore } from '@/store/editor.store';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/axios';
import { useState } from 'react';
import { examApi } from '@/features/exam/api/exam.api';
import { ProjectSelector } from './sidebar/ProjectSelector';
import { ExamList } from './sidebar/ExamList';
import { CbtExamList } from './sidebar/CbtExamList';
import { NotesList } from './sidebar/NotesList';
import { MarketingSubmenu } from './sidebar/MarketingSubmenu';
import { StrategyDocsButton } from './sidebar/StrategyDocsButton';
export { ERA_COLORS } from './sidebar/NotesList';

interface Project {
  id: string;
  name: string;
  icon: string;
  type?: 'korean-history' | 'cbt' | 'site';
  scope?: 'site' | 'exam';
  examTypeId?: string;
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
    selectedProjectId, setSelectedProjectId,
    sidebarSection, setSidebarSection,
    selectedNoteId, setSelectedNoteId,
    activeView, setActiveView,
    sidebarCollapsed, toggleSidebar,
    selectedCbtExamId, setSelectedCbtExamId,
  } = useEditorStore();

  const { data: exams } = useExams();
  const { data: notes } = useNotes();

  const { data: projects } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => apiGet<Project[]>('/projects'),
  });

  const currentProject = projects?.find((p) => p.id === selectedProjectId);
  const isCbt = currentProject?.type === 'cbt';
  const isSite = currentProject?.scope === 'site' || currentProject?.type === 'site';

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
            onClick={() => { setSidebarSection('marketing'); toggleSidebar(); }}
            className={`p-1.5 rounded-lg text-sm transition-colors ${sidebarSection === 'marketing' ? 'bg-emerald-100' : 'hover:bg-gray-100'}`}
            title="마케팅"
          >📣</button>
        </div>

        {/* 하단 문서 버튼 */}
        <div className="mt-auto flex flex-col items-center gap-1 border-t py-2">
          <StrategyDocsButton collapsed />
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-screen w-72 flex-col border-r bg-white shrink-0">
      {/* ═══ 1. Project Selector (최상단) ═══ */}
      <ProjectSelector
        selectedProjectId={selectedProjectId}
        setSelectedProjectId={setSelectedProjectId}
      />

      {/* ═══ 2. Action Bar ═══ */}
      <div className="flex items-center gap-1 border-b px-2 py-1.5">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          title="사이드바 접기"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => { setSelectedExamId(null); setActiveView('dashboard'); }}
          className="p-1.5 rounded-lg text-sm hover:bg-gray-100 text-gray-500 transition-colors"
          title="홈"
        >
          🏠
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
          className="ml-auto rounded-lg bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:bg-primary-100 hover:text-primary-700"
          title="웹사이트 열기"
        >
          사이트 &rarr;
        </a>
      </div>

      {/* ═══ 3. Tabs + Tab Content ═══ */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">

        {/* Tabs — site project는 마케팅만 의미 있음 */}
        {!isSite ? (
          <div className="flex border-b bg-white sticky top-0 z-10">
            {[
              { key: 'exam' as const, label: '📋 시험', count: exams?.length },
              { key: 'notes' as const, label: '📝 노트', count: notes?.length },
              { key: 'marketing' as const, label: '📣 마케팅', count: undefined },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setSidebarSection(t.key);
                  if (t.key === 'marketing') setActiveView('marketing');
                }}
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
        ) : (
          <div className="border-b bg-emerald-50 px-4 py-2 text-[11px] font-bold text-emerald-700">
            🌐 사이트 마케팅
          </div>
        )}

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {/* site 프로젝트 → 마케팅만 */}
          {isSite ? (
            <MarketingSubmenu scope="site" />
          ) : (
            <>
              {/* ─── 📋 시험 Tab ─── */}
              {sidebarSection === 'exam' && (
                isCbt ? (
                  <CbtExamList
                    categoryCode={currentProject?.categoryCode}
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
                  isCbt={isCbt}
                  categoryCode={currentProject?.categoryCode}
                  selectedNoteId={selectedNoteId}
                  setSelectedNoteId={setSelectedNoteId}
                  setActiveView={setActiveView}
                />
              )}

              {/* ─── 📣 마케팅 Tab ─── */}
              {sidebarSection === 'marketing' && <MarketingSubmenu scope="exam" />}
            </>
          )}
        </div>
      </div>

      {/* ═══ 4. Footer ═══ */}
      <div className="border-t bg-gray-50">
        {/* 전략 문서 (왼쪽 아래) */}
        <div className="px-3 py-2 border-b border-gray-200/70">
          <StrategyDocsButton />
        </div>
        {/* 웹 배포 */}
        <div className="flex justify-end px-4 py-2">
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
