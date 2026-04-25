import { useState } from 'react';
import { useEditorStore } from '@/store/editor.store';
import { useCompetitors } from '../hooks/useCompetitors';
import type { Competitor } from '../types';
import { AddCompetitorModal } from './AddCompetitorModal';
import { CompetitorDetail } from './CompetitorDetail';
import { GapAnalysisPanel } from './GapAnalysisPanel';

const CHANNEL_ICON: Record<string, string> = {
  website: '🌐',
  blog: '📗',
  youtube: '🎬',
  instagram: '📸',
  threads: '🧵',
};

export function CompetitorsView() {
  const projectId = useEditorStore((s) => s.selectedProjectId);
  const { data: competitors = [], isLoading, error, refetch } = useCompetitors(projectId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const notConfigured = (error as Error | undefined)?.message?.includes('R2');

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-gray-50 overflow-hidden">
      <div className="border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900">🎯 경쟁사</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            경쟁 브랜드 채널 추적 · AI 주제 분류 · 우리가 놓친 주제 갭 분석
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold hover:bg-gray-50"
          >
            새로고침
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-bold hover:bg-emerald-700"
          >
            + 새 경쟁사
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {notConfigured && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
            ⚠️ R2가 설정되지 않았습니다.
          </div>
        )}

        {selectedId ? (
          <CompetitorDetail competitorId={selectedId} onClose={() => setSelectedId(null)} />
        ) : (
          <>
            <GapAnalysisPanel />

            {isLoading ? (
              <div className="h-60 bg-gray-100 rounded-xl animate-pulse" />
            ) : competitors.length === 0 ? (
              <div className="text-center py-16 text-sm text-gray-400">
                등록된 경쟁사가 없습니다. <br />
                <button
                  onClick={() => setModalOpen(true)}
                  className="mt-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  + 첫 경쟁사 추가하기
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {competitors.map((c) => (
                  <CompetitorCard key={c.id} competitor={c} onClick={() => setSelectedId(c.id)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <AddCompetitorModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(id) => setSelectedId(id)}
      />
    </div>
  );
}

function CompetitorCard({ competitor, onClick }: { competitor: Competitor; onClick: () => void }) {
  const c = competitor;
  return (
    <button
      onClick={onClick}
      className="text-left bg-white rounded-2xl border border-gray-200 p-4 space-y-2 hover:shadow-md hover:border-emerald-300 transition-all"
    >
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-bold flex-1 truncate">{c.name}</h4>
        <span className="text-[10px] text-gray-400">{c.contents.length}개 콘텐츠</span>
      </div>

      {c.notes && <p className="text-[11px] text-gray-500 line-clamp-2">{c.notes}</p>}

      <div className="flex items-center gap-1 flex-wrap">
        {c.channels.slice(0, 5).map((ch) => (
          <span key={ch.id} className="text-sm" title={ch.url}>
            {CHANNEL_ICON[ch.type]}
          </span>
        ))}
        {c.channels.length === 0 && (
          <span className="text-[10px] text-gray-400">채널 없음</span>
        )}
      </div>

      {c.topic_clusters && c.topic_clusters.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1.5 border-t border-gray-100">
          {c.topic_clusters.slice(0, 4).map((t, i) => (
            <span
              key={i}
              className="rounded-full bg-indigo-50 text-indigo-700 px-1.5 py-0.5 text-[10px] font-semibold"
            >
              {t}
            </span>
          ))}
          {c.topic_clusters.length > 4 && (
            <span className="text-[10px] text-gray-400">+{c.topic_clusters.length - 4}</span>
          )}
        </div>
      )}

      {c.last_synced_at && (
        <p className="text-[10px] text-gray-400 pt-1">
          {new Date(c.last_synced_at).toLocaleDateString('ko-KR')} 동기화
        </p>
      )}
    </button>
  );
}
