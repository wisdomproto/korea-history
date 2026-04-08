import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiDelete } from '@/lib/axios';
import { CategoryBrowserModal } from '@/features/cbt-import/components/CategoryBrowserModal';

interface Project {
  id: string;
  name: string;
  icon: string;
  type?: 'korean-history' | 'cbt';
  categoryCode?: string;
  examCount?: number;
  questionCount?: number;
}

interface ProjectSelectorProps {
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
  children: (props: { project: Project; isOpen: boolean }) => React.ReactNode;
}

export function ProjectSelector({ selectedProjectId, setSelectedProjectId, children }: ProjectSelectorProps) {
  const qc = useQueryClient();

  const [addingProject, setAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [showCbtBrowser, setShowCbtBrowser] = useState(false);

  const { data: projects } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => apiGet<Project[]>('/projects'),
  });

  const createProjectMutation = useMutation({
    mutationFn: (name: string) => apiPost<Project>('/projects', { name, icon: '📁' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/projects/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); },
  });

  const handleAddProject = () => {
    const name = newProjectName.trim();
    if (!name) return;
    createProjectMutation.mutate(name);
    setNewProjectName('');
    setAddingProject(false);
  };

  return (
    <>
      {/* Add project button */}
      <div className="border-b bg-gray-50 px-3 py-1.5 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">프로젝트</span>
        <button
          onClick={() => setAddingProject(!addingProject)}
          className="text-[10px] font-medium text-primary-600 hover:text-primary-800"
        >
          + 추가
        </button>
      </div>

      {addingProject && (
        <div className="border-b bg-gray-50">
          <div className="flex gap-1 px-3 py-1.5">
            <input
              type="text"
              placeholder="프로젝트 이름"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddProject(); if (e.key === 'Escape') { setAddingProject(false); setNewProjectName(''); } }}
              autoFocus
              className="flex-1 rounded border px-2 py-1 text-xs focus:border-primary-500 focus:outline-none"
            />
            <button onClick={handleAddProject} className="rounded bg-primary-500 px-2 py-1 text-xs text-white hover:bg-primary-600">확인</button>
          </div>
          <button
            onClick={() => setShowCbtBrowser(true)}
            className="w-full text-left px-3 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 rounded"
          >
            + CBT 시험에서 추가
          </button>
        </div>
      )}

      {/* Project search */}
      <div className="px-3 py-1.5 border-b">
        <input
          type="text"
          placeholder="프로젝트 검색..."
          value={projectSearch}
          onChange={(e) => setProjectSearch(e.target.value)}
          className="w-full rounded border px-2 py-1 text-xs focus:border-primary-500 focus:outline-none"
        />
      </div>

      {/* Project list — sorted, filtered, selected always on top */}
      {(() => {
        const sorted = [...(projects || [])].sort((a, b) => {
          // Selected project always first
          if (a.id === selectedProjectId) return -1;
          if (b.id === selectedProjectId) return 1;
          // korean-history (default) second
          if (a.type === 'korean-history') return -1;
          if (b.type === 'korean-history') return 1;
          // Then alphabetical
          return a.name.localeCompare(b.name, 'ko');
        });
        const filtered = projectSearch.trim()
          ? sorted.filter((p) => p.name.toLowerCase().includes(projectSearch.trim().toLowerCase()) || p.id === selectedProjectId)
          : sorted;
        return filtered;
      })().map((p) => {
        const isOpen = selectedProjectId === p.id;
        return (
          <div key={p.id} className="border-b">
            {/* Project header (click to toggle) */}
            <div
              onClick={() => setSelectedProjectId(isOpen ? '' : p.id)}
              className={`group flex cursor-pointer items-center justify-between px-3 py-2 transition-colors ${
                isOpen ? 'bg-emerald-50' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[10px] text-gray-400">{isOpen ? '▾' : '▸'}</span>
                <span className="text-sm">{p.icon}</span>
                <span className={`text-xs font-bold truncate ${isOpen ? 'text-emerald-700' : 'text-gray-700'}`}>{p.name}</span>
              </div>
              {p.id !== 'proj-default' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`프로젝트 "${p.name}"을 삭제하시겠습니까?`)) {
                      deleteProjectMutation.mutate(p.id);
                      if (selectedProjectId === p.id) setSelectedProjectId('proj-default');
                    }
                  }}
                  className="ml-1 shrink-0 rounded p-0.5 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>

            {/* Project content: rendered by parent */}
            {isOpen && children({ project: p, isOpen })}
          </div>
        );
      })}

      {!projects?.length && (
        <div className="p-4 text-center text-xs text-gray-400">프로젝트가 없습니다</div>
      )}

      {/* Dialogs */}
      <CategoryBrowserModal open={showCbtBrowser} onClose={() => setShowCbtBrowser(false)} />
    </>
  );
}
