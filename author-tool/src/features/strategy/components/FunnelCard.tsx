import type { FunnelStage, ProjectStrategy, FunnelStageName } from '@/features/settings/types';
import { useDraftFunnel } from '../hooks/useStrategy';
import { useEditorStore } from '@/store/editor.store';
import { Section } from './shared';

interface Props {
  strategy: ProjectStrategy;
  onPatch: (patch: Partial<ProjectStrategy>) => void;
}

const STAGE_LABELS: Record<FunnelStageName, { ko: string; emoji: string; color: string }> = {
  awareness: { ko: '인지', emoji: '👀', color: 'bg-blue-100 text-blue-700' },
  interest: { ko: '관심', emoji: '🔍', color: 'bg-sky-100 text-sky-700' },
  evaluation: { ko: '평가', emoji: '🤔', color: 'bg-amber-100 text-amber-700' },
  conversion: { ko: '전환', emoji: '💸', color: 'bg-emerald-100 text-emerald-700' },
  retention: { ko: '유지', emoji: '♻️', color: 'bg-indigo-100 text-indigo-700' },
  advocacy: { ko: '추천', emoji: '🤝', color: 'bg-rose-100 text-rose-700' },
};

export function FunnelCard({ strategy, onPatch }: Props) {
  const projectId = useEditorStore((s) => s.selectedProjectId);
  const draft = useDraftFunnel();
  const stages = strategy.funnel?.stages ?? [];

  const update = (next: FunnelStage[]) => onPatch({ funnel: { stages: next } });

  const handleAi = async () => {
    try {
      const result = await draft.mutateAsync(projectId);
      onPatch({ funnel: { stages: result } });
    } catch (err) {
      alert(`AI 초안 실패: ${(err as Error).message}`);
    }
  };

  const updateOne = (id: string, patch: Partial<FunnelStage>) => {
    update(stages.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  return (
    <Section
      icon="🪜"
      title="퍼널 (AARRR)"
      subtitle="단계별 KPI + 채널"
      onAi={handleAi}
      aiPending={draft.isPending}
    >
      {stages.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">AI 초안으로 시작하세요.</p>
      ) : (
        <ol className="space-y-2">
          {stages.map((s, i) => {
            const meta = STAGE_LABELS[s.name];
            return (
              <li key={s.id} className="rounded-xl border border-gray-200 p-3 text-xs space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.color}`}>
                    {meta.emoji} {i + 1}. {meta.ko}
                  </span>
                  {s.kpiName && (
                    <span className="ml-auto text-[10px] text-gray-500 tabular-nums">
                      KPI: {s.kpiName}
                      {s.kpiTarget != null && ` (목표 ${s.kpiTarget.toLocaleString()})`}
                    </span>
                  )}
                </div>
                <textarea
                  value={s.description ?? ''}
                  onChange={(e) => updateOne(s.id, { description: e.target.value })}
                  rows={2}
                  placeholder="이 단계에서 사용자가 무엇을 하는가?"
                  className="w-full rounded-lg border border-gray-100 bg-gray-50 px-2 py-1 text-xs"
                />
                <div className="flex items-center gap-2">
                  <input
                    value={s.kpiName ?? ''}
                    onChange={(e) => updateOne(s.id, { kpiName: e.target.value })}
                    placeholder="KPI 이름 (예: 페이지뷰)"
                    className="flex-1 bg-white border border-gray-200 rounded px-2 py-1 text-xs"
                  />
                  <input
                    type="number"
                    value={s.kpiTarget ?? ''}
                    onChange={(e) => updateOne(s.id, { kpiTarget: Number(e.target.value) || 0 })}
                    placeholder="목표"
                    className="w-24 bg-white border border-gray-200 rounded px-2 py-1 text-xs tabular-nums"
                  />
                  <input
                    type="number"
                    value={s.kpiCurrent ?? ''}
                    onChange={(e) => updateOne(s.id, { kpiCurrent: Number(e.target.value) || 0 })}
                    placeholder="현재"
                    className="w-24 bg-white border border-gray-200 rounded px-2 py-1 text-xs tabular-nums"
                  />
                </div>
                {s.channels && s.channels.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {s.channels.map((c, idx) => (
                      <span key={idx} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Section>
  );
}
