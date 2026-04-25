import { useState } from 'react';
import { useEditorStore } from '@/store/editor.store';
import { useProjectSettings, useDebouncedPatch } from '../hooks/useSettings';
import type { ProjectSettings } from '../types';
import { BrandTab } from './BrandTab';
import { WritingGuideTab } from './WritingGuideTab';
import { ReferencesTab } from './ReferencesTab';
import { IntegrationsTab } from './IntegrationsTab';

type TabKey = 'brand' | 'guide' | 'references' | 'integrations';

const TABS: Array<{ key: TabKey; label: string; icon: string; description: string }> = [
  { key: 'brand', label: '브랜드', icon: '🎨', description: '브랜드 정체성 · 톤 · 담당자 페르소나' },
  { key: 'guide', label: '글쓰기 가이드', icon: '✍️', description: '공통 규칙 + 채널별 스타일' },
  { key: 'references', label: '참고 자료', icon: '📚', description: 'AI 생성 시 참고할 문서 · 용어집' },
  { key: 'integrations', label: 'API · 연동', icon: '🔌', description: '외부 서비스 연결 상태' },
];

export function ProjectSettingsView() {
  const projectId = useEditorStore((s) => s.selectedProjectId);
  const { data, isLoading } = useProjectSettings(projectId);
  const [activeTab, setActiveTab] = useState<TabKey>('brand');

  const { schedule, flush, isSaving, lastSavedAt } = useDebouncedPatch({ projectId });
  const [localPatch, setLocalPatch] = useState<Partial<ProjectSettings>>({});

  if (isLoading || !data) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-400">프로젝트 설정 로딩 중...</div>
      </div>
    );
  }

  // Merge server data + local unsaved patch for the tab UIs
  const merged: ProjectSettings = { ...data, ...localPatch };

  const handlePatch = (patch: Partial<ProjectSettings>) => {
    setLocalPatch((prev) => ({ ...prev, ...patch }));
    schedule(patch);
  };

  const renderTab = () => {
    const props = { settings: merged, onPatch: handlePatch };
    switch (activeTab) {
      case 'brand': return <BrandTab {...props} />;
      case 'guide': return <WritingGuideTab {...props} />;
      case 'references': return <ReferencesTab {...props} />;
      case 'integrations': return <IntegrationsTab {...props} />;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900">⚙️ 프로젝트 설정</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {data.icon} {data.name} · AI 콘텐츠 생성의 기준이 되는 정보를 관리합니다
          </p>
        </div>
        <div className="text-right text-[11px] text-gray-400">
          {isSaving ? (
            <span className="text-amber-600">저장 중...</span>
          ) : lastSavedAt ? (
            <span className="text-emerald-600">
              ✓ {new Date(lastSavedAt).toLocaleTimeString('ko-KR')} 저장됨
            </span>
          ) : (
            <span>변경 사항은 자동 저장됩니다</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white px-6 flex gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => {
                flush();
                setActiveTab(t.key);
              }}
              className={`flex items-center gap-1.5 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                active
                  ? 'border-emerald-500 text-emerald-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              title={t.description}
            >
              <span>{t.icon}</span>
              <span className="text-[13px] font-semibold">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">{renderTab()}</div>
    </div>
  );
}
