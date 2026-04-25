import type { SeasonEvent, ProjectStrategy } from '@/features/settings/types';
import { useDraftSeasonCalendar } from '../hooks/useStrategy';
import { useEditorStore } from '@/store/editor.store';
import { Section } from './shared';

interface Props {
  strategy: ProjectStrategy;
  onPatch: (patch: Partial<ProjectStrategy>) => void;
}

const TYPE_META: Record<SeasonEvent['type'], { label: string; emoji: string; color: string }> = {
  exam: { label: '시험', emoji: '📝', color: 'bg-blue-100 text-blue-700' },
  campaign: { label: '캠페인', emoji: '📣', color: 'bg-rose-100 text-rose-700' },
  launch: { label: '런칭', emoji: '🚀', color: 'bg-emerald-100 text-emerald-700' },
  holiday: { label: '연휴/명절', emoji: '🎉', color: 'bg-amber-100 text-amber-700' },
  other: { label: '기타', emoji: '📌', color: 'bg-gray-100 text-gray-600' },
};

function makeId() {
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function SeasonCalendarCard({ strategy, onPatch }: Props) {
  const projectId = useEditorStore((s) => s.selectedProjectId);
  const draft = useDraftSeasonCalendar();
  const events = strategy.seasonCalendar ?? [];

  const update = (next: SeasonEvent[]) => onPatch({ seasonCalendar: next });

  const handleAi = async () => {
    try {
      const result = await draft.mutateAsync(projectId);
      onPatch({ seasonCalendar: result });
    } catch (err) {
      alert(`AI 초안 실패: ${(err as Error).message}`);
    }
  };

  const add = () => {
    const today = new Date().toISOString().split('T')[0];
    update([...events, { id: makeId(), date: today, name: '', type: 'campaign' }]);
  };
  const updateOne = (id: string, patch: Partial<SeasonEvent>) => {
    update(events.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };
  const remove = (id: string) => update(events.filter((e) => e.id !== id));

  // Sort by date (ascending future first)
  const sorted = events.slice().sort((a, b) => a.date.localeCompare(b.date));
  const todayKey = new Date().toISOString().split('T')[0];

  return (
    <Section
      icon="📅"
      title="시즌 캘린더"
      subtitle="향후 12개월 주요 이벤트"
      onAi={handleAi}
      aiPending={draft.isPending}
    >
      {sorted.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">AI 초안으로 시작하세요.</p>
      ) : (
        <ul className="space-y-1.5">
          {sorted.map((e) => {
            const m = TYPE_META[e.type];
            const past = e.date < todayKey;
            return (
              <li
                key={e.id}
                className={`flex items-center gap-2 rounded-lg border border-gray-100 p-2 text-xs ${
                  past ? 'opacity-50' : ''
                }`}
              >
                <input
                  type="date"
                  value={e.date}
                  onChange={(ev) => updateOne(e.id, { date: ev.target.value })}
                  className="text-xs border-0 bg-transparent w-32 tabular-nums"
                />
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${m.color}`}>
                  {m.emoji} {m.label}
                </span>
                <input
                  value={e.name}
                  onChange={(ev) => updateOne(e.id, { name: ev.target.value })}
                  placeholder="이벤트 이름"
                  className="flex-1 bg-transparent text-xs outline-none border-b border-transparent focus:border-emerald-300 px-1 py-0.5"
                />
                <select
                  value={e.type}
                  onChange={(ev) => updateOne(e.id, { type: ev.target.value as SeasonEvent['type'] })}
                  className="text-[10px] border-0 bg-transparent"
                >
                  {Object.entries(TYPE_META).map(([k, v]) => (
                    <option key={k} value={k}>{v.emoji} {v.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => remove(e.id)}
                  className="text-rose-400 hover:text-rose-600 text-xs"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button
        onClick={add}
        className="w-full rounded-lg border border-dashed border-gray-300 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
      >
        + 이벤트 추가
      </button>
    </Section>
  );
}
