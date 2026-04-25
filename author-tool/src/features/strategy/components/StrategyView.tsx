import { useState } from 'react';
import { useEditorStore } from '@/store/editor.store';
import { useProjectSettings, useDebouncedPatch } from '@/features/settings/hooks/useSettings';
import type { ProjectStrategy } from '@/features/settings/types';
import { IcpCard } from './IcpCard';
import { JtbdCard } from './JtbdCard';
import { FunnelCard } from './FunnelCard';
import { ChannelMixCard } from './ChannelMixCard';
import { SeasonCalendarCard } from './SeasonCalendarCard';
import { OkrCard } from './OkrCard';

export function StrategyView() {
  const projectId = useEditorStore((s) => s.selectedProjectId);
  const { data: settings, isLoading } = useProjectSettings(projectId);
  const { schedule, flush, isSaving, lastSavedAt } = useDebouncedPatch({ projectId });
  const [localPatch, setLocalPatch] = useState<{ strategy?: ProjectStrategy }>({});

  if (isLoading || !settings) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-400">전략 데이터 로딩 중...</div>
      </div>
    );
  }

  const merged: ProjectStrategy = { ...(settings.strategy ?? {}), ...(localPatch.strategy ?? {}) };

  const handleStrategyPatch = (patch: Partial<ProjectStrategy>) => {
    const next = { ...merged, ...patch };
    setLocalPatch({ strategy: next });
    schedule({ strategy: next });
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-gray-50 overflow-hidden">
      <div className="border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900">🧭 마케팅 전략</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            ICP · JTBD · 퍼널 · 채널 믹스 · 시즌 캘린더 · OKR — 각 섹션마다 AI 초안 가능
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
            <button
              onClick={() => flush()}
              className="hover:text-gray-600"
            >
              자동 저장
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-4">
          <IcpCard strategy={merged} onPatch={handleStrategyPatch} />
          <JtbdCard strategy={merged} onPatch={handleStrategyPatch} />
          <FunnelCard strategy={merged} onPatch={handleStrategyPatch} />
          <ChannelMixCard strategy={merged} onPatch={handleStrategyPatch} />
          <SeasonCalendarCard strategy={merged} onPatch={handleStrategyPatch} />
          <OkrCard strategy={merged} onPatch={handleStrategyPatch} />
        </div>
      </div>
    </div>
  );
}
