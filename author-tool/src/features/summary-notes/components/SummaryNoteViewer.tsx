import { useEditorStore } from '@/store/editor.store';
import { useSummaryNote } from '../hooks/useSummaryNote';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/axios';

export function SummaryNoteViewer() {
  const { selectedNoteId, selectedProjectId } = useEditorStore();
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: () => apiGet<any[]>('/projects') });
  const currentProject = projects?.find((p: any) => p.id === selectedProjectId);
  const categoryCode = currentProject?.categoryCode;

  const { data: note, isLoading } = useSummaryNote(categoryCode, selectedNoteId ?? undefined);

  if (!selectedNoteId) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="text-4xl mb-2">📝</div>
          <p>왼쪽에서 요약노트를 선택하세요</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-500">
        요약노트를 로드할 수 없습니다.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <iframe
        srcDoc={note.html}
        className="w-full h-full border-0"
        title={note.title}
      />
    </div>
  );
}
