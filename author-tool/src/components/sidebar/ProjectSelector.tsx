import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiDelete } from '@/lib/axios';
import { CategoryBrowserModal } from '@/features/cbt-import/components/CategoryBrowserModal';

export interface Project {
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
}

export function ProjectSelector({ selectedProjectId, setSelectedProjectId }: ProjectSelectorProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showCbtBrowser, setShowCbtBrowser] = useState(false);
  const [addingProject, setAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = projects?.find((p) => p.id === selectedProjectId);

  const sorted = [...(projects || [])].sort((a, b) => {
    if (a.type === 'korean-history') return -1;
    if (b.type === 'korean-history') return 1;
    return a.name.localeCompare(b.name, 'ko');
  });

  const filtered = search.trim()
    ? sorted.filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()))
    : sorted;

  const handleAddProject = () => {
    const name = newProjectName.trim();
    if (!name) return;
    createProjectMutation.mutate(name);
    setNewProjectName('');
    setAddingProject(false);
  };

  return (
    <div className="relative border-b" ref={dropdownRef}>
      {/* Selected project header */}
      <button
        onClick={() => { setOpen(!open); setSearch(''); }}
        className="flex w-full items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">{selected?.icon ?? '📂'}</span>
          <span className="text-sm font-bold text-gray-800 truncate">{selected?.name ?? '프로젝트 선택'}</span>
        </div>
        <svg className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 border-b bg-white shadow-lg max-h-80 flex flex-col">
          {/* Search */}
          <div className="px-3 py-1.5 border-b">
            <input
              type="text"
              placeholder="프로젝트 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="w-full rounded border px-2 py-1 text-xs focus:border-primary-500 focus:outline-none"
            />
          </div>

          {/* Project list */}
          <div className="overflow-y-auto flex-1">
            {filtered.map((p) => (
              <div
                key={p.id}
                onClick={() => { setSelectedProjectId(p.id); setOpen(false); }}
                className={`group flex cursor-pointer items-center justify-between px-3 py-2 transition-colors ${
                  p.id === selectedProjectId ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm">{p.icon}</span>
                  <span className={`text-xs font-bold truncate ${p.id === selectedProjectId ? 'text-emerald-700' : 'text-gray-700'}`}>
                    {p.name}
                  </span>
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
            ))}
          </div>

          {/* Add project */}
          <div className="border-t bg-gray-50">
            {addingProject ? (
              <div className="px-3 py-1.5">
                <div className="flex gap-1">
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
                  onClick={() => { setShowCbtBrowser(true); setOpen(false); }}
                  className="mt-1 w-full text-left text-xs text-indigo-600 hover:text-indigo-800"
                >
                  + CBT 시험에서 추가
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddingProject(true)}
                className="w-full px-3 py-1.5 text-left text-[10px] font-medium text-primary-600 hover:text-primary-800"
              >
                + 프로젝트 추가
              </button>
            )}
          </div>
        </div>
      )}

      <CategoryBrowserModal open={showCbtBrowser} onClose={() => setShowCbtBrowser(false)} />
    </div>
  );
}
