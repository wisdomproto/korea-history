import { useState } from 'react';
import { useContents, useDeleteContent } from '@/features/content/hooks/useContent';
import { NewContentDialog } from '@/features/content/components/NewContentDialog';
import type { ContentMeta } from '@/lib/content-types';

interface ContentListProps {
  selectedProjectId: string;
  selectedContentId: string | null;
  setSelectedContentId: (id: string | null) => void;
}

export function ContentList({ selectedProjectId, selectedContentId, setSelectedContentId }: ContentListProps) {
  const { data: contents } = useContents(selectedProjectId);
  const deleteContentMutation = useDeleteContent();

  const [showNewContent, setShowNewContent] = useState(false);
  const [contentFilter, setContentFilter] = useState<'all' | 'exam' | 'note' | 'free'>('all');
  const [contentSearch, setContentSearch] = useState('');

  return (
    <>
      <div className="space-y-2 border-b px-3 py-2">
        <button
          className="w-full rounded-lg border border-gray-200 py-1.5 text-xs font-medium hover:bg-gray-50"
          onClick={() => setShowNewContent(true)}
        >
          + 새 컨텐츠
        </button>
        <input
          type="text"
          placeholder="검색..."
          value={contentSearch}
          onChange={(e) => setContentSearch(e.target.value)}
          className="w-full rounded-lg border px-3 py-1.5 text-xs focus:border-primary-500 focus:outline-none"
        />
        <div className="flex gap-1 flex-wrap">
          {(['all', 'exam', 'note', 'free'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setContentFilter(f)}
              className={`px-2 py-0.5 rounded-full text-[10px] transition-colors ${
                contentFilter === f ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? '전체' : f === 'exam' ? '기출' : f === 'note' ? '노트' : '자유'}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 420px)' }}>
        {contents?.filter((c: ContentMeta) => {
          if (contentFilter !== 'all' && c.sourceType !== contentFilter) return false;
          if (contentSearch && !c.title.includes(contentSearch)) return false;
          return true;
        }).map((c: ContentMeta) => (
          <div
            key={c.id}
            onClick={() => setSelectedContentId(c.id)}
            className={`group cursor-pointer px-4 py-2 border-b transition-colors hover:bg-gray-50 ${
              selectedContentId === c.id ? 'bg-primary-50 border-l-4 border-l-primary-500' : 'border-l-4 border-l-transparent'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold truncate">{c.title}</div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`"${c.title}" 컨텐츠를 삭제하시겠습니까?`)) {
                    deleteContentMutation.mutate(c.id);
                    if (selectedContentId === c.id) setSelectedContentId(null);
                  }
                }}
                className="shrink-0 rounded p-0.5 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
                title="컨텐츠 삭제"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
              <span>{c.sourceType === 'exam' ? '📋 기출' : c.sourceType === 'note' ? '📝 노트' : '✍️ 자유'}</span>
              <span>{new Date(c.createdAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}</span>
            </div>
          </div>
        ))}
        {contents?.length === 0 && (
          <div className="p-4 text-center text-xs text-gray-400">컨텐츠가 없습니다</div>
        )}
      </div>

      {/* Dialog */}
      <NewContentDialog open={showNewContent} onClose={() => setShowNewContent(false)} />
    </>
  );
}
