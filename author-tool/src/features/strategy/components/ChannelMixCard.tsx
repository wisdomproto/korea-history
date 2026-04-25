import type { ChannelMixItem, ProjectStrategy } from '@/features/settings/types';
import { useDraftChannelMix } from '../hooks/useStrategy';
import { useEditorStore } from '@/store/editor.store';
import { Section } from './shared';

interface Props {
  strategy: ProjectStrategy;
  onPatch: (patch: Partial<ProjectStrategy>) => void;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#ec4899', '#6366f1'];

function makeId() {
  return `mix-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function ChannelMixCard({ strategy, onPatch }: Props) {
  const projectId = useEditorStore((s) => s.selectedProjectId);
  const draft = useDraftChannelMix();
  const items = strategy.channelMix ?? [];
  const total = items.reduce((s, i) => s + (i.weightPct || 0), 0);

  const update = (next: ChannelMixItem[]) => onPatch({ channelMix: next });

  const handleAi = async () => {
    try {
      const result = await draft.mutateAsync(projectId);
      onPatch({ channelMix: result });
    } catch (err) {
      alert(`AI 초안 실패: ${(err as Error).message}`);
    }
  };

  const add = () => {
    update([...items, { id: makeId(), channel: 'blog', weightPct: 10, purpose: '' }]);
  };
  const updateOne = (id: string, patch: Partial<ChannelMixItem>) => {
    update(items.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };
  const remove = (id: string) => update(items.filter((m) => m.id !== id));

  return (
    <Section
      icon="🥧"
      title="채널 믹스"
      subtitle={`총 가중치: ${total}% ${total !== 100 ? '(권장: 100%)' : '✓'}`}
      onAi={handleAi}
      aiPending={draft.isPending}
    >
      {items.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">AI 초안으로 시작하세요.</p>
      ) : (
        <>
          {/* Stacked bar */}
          <div className="flex h-6 rounded-full overflow-hidden bg-gray-100">
            {items.map((m, i) => (
              <div
                key={m.id}
                style={{ width: `${m.weightPct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                title={`${m.channel}: ${m.weightPct}%`}
              />
            ))}
          </div>

          <ul className="space-y-2">
            {items.map((m, i) => (
              <li key={m.id} className="rounded-xl border border-gray-200 p-3 text-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <input
                    value={m.channel}
                    onChange={(e) => updateOne(m.id, { channel: e.target.value })}
                    placeholder="채널"
                    className="flex-1 font-bold text-xs outline-none border-b border-transparent focus:border-emerald-300 px-1 py-0.5 bg-transparent"
                  />
                  <input
                    type="number"
                    value={m.weightPct}
                    onChange={(e) => updateOne(m.id, { weightPct: Number(e.target.value) || 0 })}
                    min={0}
                    max={100}
                    className="w-16 text-right tabular-nums border border-gray-200 rounded px-1.5 py-0.5"
                  />
                  <span className="text-[10px] text-gray-400">%</span>
                  <button
                    onClick={() => remove(m.id)}
                    className="text-rose-500 hover:text-rose-700 ml-1 text-xs"
                  >
                    ×
                  </button>
                </div>
                <input
                  value={m.purpose ?? ''}
                  onChange={(e) => updateOne(m.id, { purpose: e.target.value })}
                  placeholder="이 채널의 역할 (예: 검색 유입)"
                  className="w-full text-[11px] outline-none border-b border-transparent focus:border-emerald-300 px-1 py-0.5 bg-transparent text-gray-500"
                />
              </li>
            ))}
          </ul>
        </>
      )}

      <button
        onClick={add}
        className="w-full rounded-lg border border-dashed border-gray-300 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
      >
        + 채널 추가
      </button>
    </Section>
  );
}
