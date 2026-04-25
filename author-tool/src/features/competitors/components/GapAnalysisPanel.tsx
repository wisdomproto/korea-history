import { useState } from 'react';
import { useEditorStore } from '@/store/editor.store';
import { useGapAnalysis } from '../hooks/useCompetitors';
import type { GapAnalysis } from '../types';

export function GapAnalysisPanel() {
  const projectId = useEditorStore((s) => s.selectedProjectId);
  const gap = useGapAnalysis();
  const [data, setData] = useState<GapAnalysis | null>(null);

  const handleRun = async () => {
    try {
      const result = await gap.mutateAsync(projectId);
      setData(result);
    } catch (err) {
      alert(`갭 분석 실패: ${(err as Error).message}`);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold">🎯 갭 분석</h3>
          <p className="text-[11px] text-gray-500">
            경쟁사가 다루지만 우리가 다루지 않는 주제를 AI가 추출합니다.
          </p>
        </div>
        <button
          onClick={handleRun}
          disabled={gap.isPending}
          className="rounded-lg bg-indigo-600 text-white px-3 py-1.5 text-xs font-bold disabled:bg-gray-300 hover:bg-indigo-700"
        >
          {gap.isPending ? '분석 중...' : '🤖 갭 분석 실행'}
        </button>
      </div>

      {data && (
        <div className="space-y-3 pt-2 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg bg-emerald-50 p-2.5">
              <div className="text-[10px] font-bold text-emerald-700 uppercase">우리 주제</div>
              <div className="text-lg font-extrabold text-emerald-700">{data.ourTopics.length}개</div>
            </div>
            <div className="rounded-lg bg-rose-50 p-2.5">
              <div className="text-[10px] font-bold text-rose-700 uppercase">경쟁사 주제</div>
              <div className="text-lg font-extrabold text-rose-700">{data.competitorTopics.length}개</div>
            </div>
          </div>

          {data.gaps.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">
              경쟁사 주제 데이터가 부족합니다. 경쟁사 카드에서 동기화 + 주제 추출을 먼저 실행해주세요.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.gaps.map((g, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs space-y-1.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-900">{g.topic}</span>
                    <span className="ml-auto inline-flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((p) => (
                        <span
                          key={p}
                          className={`w-1.5 h-1.5 rounded-full ${p <= g.priority ? 'bg-amber-600' : 'bg-amber-200'}`}
                        />
                      ))}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-700">
                    제안 키워드: {g.suggestedKeywords.map((k) => `#${k}`).join(' ')}
                  </div>
                  <div className="text-[10px] text-amber-700">
                    출처: {g.sourceCompetitors.join(', ')}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
