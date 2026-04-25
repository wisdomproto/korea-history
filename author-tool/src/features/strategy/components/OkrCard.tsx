import type { Okr, KeyResult, ProjectStrategy } from '@/features/settings/types';
import { useDraftOkrs } from '../hooks/useStrategy';
import { useEditorStore } from '@/store/editor.store';
import { Section } from './shared';

interface Props {
  strategy: ProjectStrategy;
  onPatch: (patch: Partial<ProjectStrategy>) => void;
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function defaultQuarter(): string {
  const d = new Date();
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `${d.getFullYear()}-Q${q}`;
}

export function OkrCard({ strategy, onPatch }: Props) {
  const projectId = useEditorStore((s) => s.selectedProjectId);
  const draft = useDraftOkrs();
  const okrs = strategy.okrs ?? [];

  const update = (next: Okr[]) => onPatch({ okrs: next });

  const handleAi = async () => {
    try {
      const result = await draft.mutateAsync({ projectId, quarter: defaultQuarter() });
      onPatch({ okrs: [...okrs, ...result] });
    } catch (err) {
      alert(`AI 초안 실패: ${(err as Error).message}`);
    }
  };

  const updateOne = (id: string, patch: Partial<Okr>) => {
    update(okrs.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  };
  const remove = (id: string) => update(okrs.filter((o) => o.id !== id));
  const add = () => {
    update([
      ...okrs,
      { id: makeId('okr'), quarter: defaultQuarter(), objective: '', keyResults: [] },
    ]);
  };

  const updateKr = (okrId: string, krId: string, patch: Partial<KeyResult>) => {
    update(okrs.map((o) => o.id === okrId
      ? { ...o, keyResults: o.keyResults.map((k) => k.id === krId ? { ...k, ...patch } : k) }
      : o));
  };
  const addKr = (okrId: string) => {
    update(okrs.map((o) => o.id === okrId
      ? { ...o, keyResults: [...o.keyResults, { id: makeId('kr'), text: '', target: 0, current: 0 }] }
      : o));
  };
  const removeKr = (okrId: string, krId: string) => {
    update(okrs.map((o) => o.id === okrId
      ? { ...o, keyResults: o.keyResults.filter((k) => k.id !== krId) }
      : o));
  };

  return (
    <Section
      icon="🎖"
      title="OKR — 분기 목표"
      subtitle="Objective 1개 + Key Results 3~4개"
      onAi={handleAi}
      aiPending={draft.isPending}
    >
      {okrs.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">AI 초안으로 시작하세요.</p>
      ) : (
        <ul className="space-y-3">
          {okrs.map((o) => (
            <li key={o.id} className="rounded-xl border border-gray-200 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  value={o.quarter}
                  onChange={(e) => updateOne(o.id, { quarter: e.target.value })}
                  placeholder="2026-Q2"
                  className="text-[10px] font-bold uppercase border border-gray-200 rounded px-1.5 py-0.5 w-20"
                />
                <input
                  value={o.objective}
                  onChange={(e) => updateOne(o.id, { objective: e.target.value })}
                  placeholder="목표 (정성적, 영감적)"
                  className="flex-1 text-sm font-bold bg-transparent outline-none border-b border-transparent focus:border-emerald-300 px-1 py-0.5"
                />
                <button
                  onClick={() => remove(o.id)}
                  className="text-rose-500 hover:text-rose-700 text-xs"
                >
                  삭제
                </button>
              </div>

              <ul className="space-y-1.5 pl-4 border-l-2 border-emerald-200">
                {o.keyResults.map((kr) => {
                  const progress = (kr.target ?? 0) > 0
                    ? Math.min(100, Math.round(((kr.current ?? 0) / (kr.target ?? 1)) * 100))
                    : 0;
                  return (
                    <li key={kr.id} className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <input
                          value={kr.text}
                          onChange={(e) => updateKr(o.id, kr.id, { text: e.target.value })}
                          placeholder="Key Result"
                          className="flex-1 bg-transparent outline-none border-b border-transparent focus:border-emerald-300 px-1 py-0.5"
                        />
                        <input
                          type="number"
                          value={kr.current ?? ''}
                          onChange={(e) => updateKr(o.id, kr.id, { current: Number(e.target.value) || 0 })}
                          placeholder="현재"
                          className="w-16 text-right tabular-nums border border-gray-200 rounded px-1.5 py-0.5"
                        />
                        <span className="text-[10px] text-gray-400">/</span>
                        <input
                          type="number"
                          value={kr.target ?? ''}
                          onChange={(e) => updateKr(o.id, kr.id, { target: Number(e.target.value) || 0 })}
                          placeholder="목표"
                          className="w-16 text-right tabular-nums border border-gray-200 rounded px-1.5 py-0.5"
                        />
                        <input
                          value={kr.unit ?? ''}
                          onChange={(e) => updateKr(o.id, kr.id, { unit: e.target.value })}
                          placeholder="단위"
                          className="w-12 text-[10px] border border-gray-200 rounded px-1 py-0.5"
                        />
                        <button
                          onClick={() => removeKr(o.id, kr.id)}
                          className="text-rose-400 text-xs"
                        >
                          ×
                        </button>
                      </div>
                      {(kr.target ?? 0) > 0 && (
                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
                <li>
                  <button
                    onClick={() => addKr(o.id)}
                    className="text-[10px] text-gray-500 hover:text-gray-700"
                  >
                    + Key Result 추가
                  </button>
                </li>
              </ul>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={add}
        className="w-full rounded-lg border border-dashed border-gray-300 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
      >
        + OKR 추가
      </button>
    </Section>
  );
}
