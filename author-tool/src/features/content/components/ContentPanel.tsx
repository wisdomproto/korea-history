// author-tool/src/features/content/components/ContentPanel.tsx
import { useEditorStore } from '../../../store/editor.store';
import { useContent, useDeleteContent } from '../hooks/useContent';
import { CHANNEL_TABS } from '../../../lib/content-types';
import { BaseArticlePanel } from './BaseArticlePanel';
import { BlogPanel } from './BlogPanel';
import { CardNewsPanel } from './CardNewsPanel';
import { ThreadsPanel } from './ThreadsPanel';
import { LongFormPanel } from './LongFormPanel';
import { ShortFormPanel } from './ShortFormPanel';

const SOURCE_BADGES: Record<string, { icon: string; label: string }> = {
  exam: { icon: '📋', label: '기출' },
  note: { icon: '📝', label: '노트' },
  free: { icon: '✍️', label: '자유' },
};

export function ContentPanel() {
  const contentId = useEditorStore((s) => s.selectedContentId);
  const activeTab = useEditorStore((s) => s.activeContentTab);
  const setActiveTab = useEditorStore((s) => s.setActiveContentTab);
  const setSelectedContentId = useEditorStore((s) => s.setSelectedContentId);

  const { data: contentFile, isLoading } = useContent(contentId);
  const deleteContent = useDeleteContent();

  if (!contentId) {
    return (
      <div className="flex items-center justify-center h-full w-full text-gray-400">
        왼쪽에서 컨텐츠를 선택하거나 새로 만드세요
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full text-gray-400">로딩 중...</div>
    );
  }

  if (!contentFile) {
    return (
      <div className="flex items-center justify-center h-full w-full text-gray-400">
        컨텐츠를 찾을 수 없습니다
      </div>
    );
  }

  const { content } = contentFile;
  const badge = SOURCE_BADGES[content.sourceType];

  const handleDelete = async () => {
    if (!confirm('이 컨텐츠를 삭제하시겠습니까?')) return;
    await deleteContent.mutateAsync(contentId);
    setSelectedContentId(null);
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold">{content.title}</h3>
          <span className="text-[11px] text-gray-400">
            {badge.icon} {badge.label}
            {content.sourceId && ` · ${content.sourceId}`}
            {' · '}
            {new Date(content.createdAt).toLocaleDateString('ko-KR')}
          </span>
        </div>
        <button
          className="px-3 py-1 text-xs border border-gray-200 rounded-md hover:bg-gray-50"
          onClick={handleDelete}
        >
          삭제
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 px-5">
        {CHANNEL_TABS.map((tab) => (
          <button
            key={tab.key}
            className={`px-4 py-2.5 text-[13px] border-b-2 transition ${
              activeTab === tab.key
                ? 'border-emerald-500 text-emerald-600 font-bold'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'base' && <BaseArticlePanel contentFile={contentFile} />}
        {activeTab === 'blog' && <BlogPanel contentFile={contentFile} />}
        {activeTab === 'instagram' && <CardNewsPanel contentFile={contentFile} />}
        {activeTab === 'threads' && <ThreadsPanel contentFile={contentFile} />}
        {activeTab === 'longform' && <LongFormPanel contentFile={contentFile} />}
        {activeTab === 'shortform' && <ShortFormPanel contentFile={contentFile} />}
      </div>
    </div>
  );
}
