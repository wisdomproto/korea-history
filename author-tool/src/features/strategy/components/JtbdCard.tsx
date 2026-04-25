import type { JtbdSpec, ProjectStrategy } from '@/features/settings/types';
import { useDraftJtbds } from '../hooks/useStrategy';
import { useEditorStore } from '@/store/editor.store';
import { Section } from './shared';

interface Props {
  strategy: ProjectStrategy;
  onPatch: (patch: Partial<ProjectStrategy>) => void;
}

function makeId() {
  return `jtbd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function JtbdCard({ strategy, onPatch }: Props) {
  const projectId = useEditorStore((s) => s.selectedProjectId);
  const draft = useDraftJtbds();
  const jtbds = strategy.jtbds ?? [];

  const update = (next: JtbdSpec[]) => onPatch({ jtbds: next });

  const handleAi = async () => {
    try {
      const result = await draft.mutateAsync(projectId);
      onPatch({ jtbds: result });
    } catch (err) {
      alert(`AI 초안 실패: ${(err as Error).message}`);
    }
  };

  const add = () => {
    update([
      ...jtbds,
      { id: makeId(), situation: '', motivation: '', outcome: '' },
    ]);
  };

  const updateOne = (id: string, patch: Partial<JtbdSpec>) => {
    update(jtbds.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  };

  const remove = (id: string) => update(jtbds.filter((j) => j.id !== id));

  return (
    <Section
      icon="🧩"
      title="JTBD — Jobs to be Done"
      subtitle="When [상황], I want [동기], so I can [결과]"
      onAi={handleAi}
      aiPending={draft.isPending}
    >
      {jtbds.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">아직 등록된 JTBD가 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {jtbds.map((j) => (
            <li key={j.id} className="rounded-xl border border-gray-200 p-3 text-xs space-y-1.5">
              <div className="flex gap-1 items-center">
                <span className="text-[10px] font-bold text-emerald-600 w-12">When</span>
                <input
                  value={j.situation}
                  onChange={(e) => updateOne(j.id, { situation: e.target.value })}
                  placeholder="상황"
                  className="flex-1 bg-transparent text-xs outline-none border-b border-transparent focus:border-emerald-300 px-1 py-0.5"
                />
              </div>
              <div className="flex gap-1 items-center">
                <span className="text-[10px] font-bold text-emerald-600 w-12">I want</span>
                <input
                  value={j.motivation}
                  onChange={(e) => updateOne(j.id, { motivation: e.target.value })}
                  placeholder="동기"
                  className="flex-1 bg-transparent text-xs outline-none border-b border-transparent focus:border-emerald-300 px-1 py-0.5"
                />
              </div>
              <div className="flex gap-1 items-center">
                <span className="text-[10px] font-bold text-emerald-600 w-12">so I can</span>
                <input
                  value={j.outcome}
                  onChange={(e) => updateOne(j.id, { outcome: e.target.value })}
                  placeholder="결과"
                  className="flex-1 bg-transparent text-xs outline-none border-b border-transparent focus:border-emerald-300 px-1 py-0.5"
                />
                <button
                  onClick={() => remove(j.id)}
                  className="text-[10px] text-rose-500 hover:text-rose-700 ml-2"
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <button
        onClick={add}
        className="w-full rounded-lg border border-dashed border-gray-300 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
      >
        + JTBD 추가
      </button>
    </Section>
  );
}
