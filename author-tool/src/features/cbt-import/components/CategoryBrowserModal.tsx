import { useState, useMemo } from 'react';
import { useCbtCategories } from '../hooks/useCbtCategories';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPost } from '@/lib/axios';
import { useEditorStore } from '@/store/editor.store';
import { Button } from '@/components/Button';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CategoryBrowserModal({ open, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<{ name: string; code: string; examCount: number; questionCount: number } | null>(null);
  const { data: categories, isLoading, error } = useCbtCategories(open);
  const qc = useQueryClient();
  const { setSelectedProjectId } = useEditorStore();

  const filtered = useMemo(() => {
    if (!categories) return [];
    if (!search.trim()) return categories;
    const q = search.trim().toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, search]);

  const createMutation = useMutation({
    mutationFn: (cat: typeof selected) =>
      apiPost<any>('/projects', {
        name: cat!.name,
        icon: '📝',
        type: 'cbt',
        categoryCode: cat!.code,
        examCount: cat!.examCount,
        questionCount: cat!.questionCount,
      }),
    onSuccess: (project) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      setSelectedProjectId(project.id);
      onClose();
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[560px] max-h-[80vh] bg-white rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">CBT 시험 추가</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
          <input
            type="text"
            placeholder="시험 검색 (예: 전기기능사, 정보처리기사...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            autoFocus
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
            </div>
          )}
          {error && (
            <div className="text-center py-12 text-red-500 text-sm">
              CBT 데이터를 로드할 수 없습니다. R2 버킷 설정을 확인하세요.
            </div>
          )}
          {!isLoading && !error && filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">
              {search ? '검색 결과가 없습니다' : '카테고리가 없습니다'}
            </div>
          )}
          {filtered.map((cat) => (
            <button
              key={cat.code}
              onClick={() => setSelected(cat)}
              className={`w-full text-left px-3 py-2.5 rounded-lg mb-0.5 transition-colors ${
                selected?.code === cat.code ? 'bg-indigo-50 ring-1 ring-indigo-300' : 'hover:bg-gray-50'
              }`}
            >
              <div className="font-medium text-sm">{cat.name}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {cat.examCount}개 시험 · {cat.questionCount.toLocaleString()}문제
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {categories ? `${filtered.length}/${categories.length}개` : ''}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>취소</Button>
            <Button
              onClick={() => selected && createMutation.mutate(selected)}
              disabled={!selected}
              loading={createMutation.isPending}
            >
              프로젝트 추가
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
