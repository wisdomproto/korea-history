import { useState } from 'react';
import { useEditorStore } from '@/store/editor.store';
import { useProjectSettings } from '@/features/settings/hooks/useSettings';
import { KeywordResearchTab } from './KeywordResearchTab';
import { SavedKeywordsTab } from './SavedKeywordsTab';
import { IdeaBoardTab } from './IdeaBoardTab';

type Tab = 'research' | 'saved' | 'ideas';

const TABS: Array<{ key: Tab; label: string; icon: string }> = [
  { key: 'research', label: '키워드 리서치', icon: '🔍' },
  { key: 'saved', label: '저장 키워드', icon: '⭐' },
  { key: 'ideas', label: '아이디어 보드', icon: '💡' },
];

export function IdeasView() {
  const projectId = useEditorStore((s) => s.selectedProjectId);
  const { data: settings } = useProjectSettings(projectId);
  const [tab, setTab] = useState<Tab>('research');

  const keywordCount = settings?.savedKeywords?.length ?? 0;
  const ideaCount = settings?.savedIdeas?.length ?? 0;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <h2 className="text-lg font-extrabold text-gray-900">💡 키워드 / 아이디어</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Naver 검색량 · GSC 실측 검색어 · Gemini AI로 콘텐츠 주제를 발굴합니다.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white px-6 flex gap-1">
        {TABS.map((t) => {
          const active = tab === t.key;
          const count = t.key === 'saved' ? keywordCount : t.key === 'ideas' ? ideaCount : undefined;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                active ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>{t.icon}</span>
              <span className="text-[13px] font-semibold">{t.label}</span>
              {count != null && count > 0 && (
                <span className="ml-1 inline-flex items-center justify-center text-[10px] font-bold text-white bg-gray-400 rounded-full px-1.5 min-w-[18px]">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'research' && <KeywordResearchTab />}
        {tab === 'saved' && <SavedKeywordsTab onJumpToIdeas={() => setTab('ideas')} />}
        {tab === 'ideas' && <IdeaBoardTab />}
      </div>
    </div>
  );
}
