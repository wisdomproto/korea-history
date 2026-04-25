import { useEditorStore } from '@/store/editor.store';
import { ContentList } from '@/components/sidebar/ContentList';
import { ContentPanel } from '@/features/content/components/ContentPanel';

export function ContentWorkspace() {
  const { selectedProjectId, selectedContentId, setSelectedContentId } = useEditorStore();

  return (
    <div className="flex flex-1 min-w-0">
      {/* Middle: Content list */}
      <aside className="w-72 flex-shrink-0 flex flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-2.5">
          <h2 className="text-sm font-bold">콘텐츠 생성</h2>
          <p className="text-[10px] text-gray-400 mt-0.5">프로젝트의 콘텐츠 목록</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ContentList
            selectedProjectId={selectedProjectId}
            selectedContentId={selectedContentId}
            setSelectedContentId={setSelectedContentId}
          />
        </div>
      </aside>

      {/* Right: Editor with channel tabs */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        <ContentPanel />
      </div>
    </div>
  );
}
