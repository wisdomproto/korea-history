import { useState } from 'react';
import {
  useCompetitor,
  useDeleteCompetitor,
  useSyncCompetitor,
  useExtractTopics,
  useRemoveChannel,
} from '../hooks/useCompetitors';
import type { CompetitorContent } from '../types';

interface Props {
  competitorId: string;
  onClose: () => void;
}

const CHANNEL_ICON: Record<string, string> = {
  website: '🌐',
  blog: '📗',
  youtube: '🎬',
  instagram: '📸',
  threads: '🧵',
};

function fmt(n: number | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString();
}

export function CompetitorDetail({ competitorId, onClose }: Props) {
  const { data: c, isLoading } = useCompetitor(competitorId);
  const sync = useSyncCompetitor();
  const extract = useExtractTopics();
  const remove = useDeleteCompetitor();
  const removeChannel = useRemoveChannel();

  const [tab, setTab] = useState<'content' | 'topics'>('content');

  if (isLoading) return <div className="h-60 bg-gray-100 rounded-xl animate-pulse" />;
  if (!c) return null;

  const handleSync = async () => {
    try {
      const result = await sync.mutateAsync(c.id);
      const msg = result.reports
        .map((r) => `${CHANNEL_ICON[r.type] ?? ''} ${r.fetched}건${r.message ? ` (${r.message})` : ''}`)
        .join('\n');
      alert(`동기화 완료 (총 ${result.contentCount}건):\n${msg}`);
    } catch (err) {
      alert(`실패: ${(err as Error).message}`);
    }
  };

  const handleExtract = async () => {
    if (c.contents.length === 0) return alert('먼저 콘텐츠를 동기화하세요');
    try {
      await extract.mutateAsync(c.id);
    } catch (err) {
      alert(`주제 추출 실패: ${(err as Error).message}`);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`"${c.name}" 경쟁사를 삭제할까요? 모든 채널/콘텐츠 데이터가 함께 사라집니다.`)) return;
    await remove.mutateAsync(c.id);
    onClose();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex-1">
          <h3 className="text-base font-bold">{c.name}</h3>
          {c.notes && <p className="text-xs text-gray-500 mt-0.5">{c.notes}</p>}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {c.channels.map((ch) => (
              <span
                key={ch.id}
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px]"
              >
                <span>{CHANNEL_ICON[ch.type]}</span>
                <a
                  href={ch.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-gray-700 hover:underline truncate max-w-[180px]"
                  title={ch.url}
                >
                  {ch.url.replace(/^https?:\/\//, '').slice(0, 40)}
                </a>
                <button
                  onClick={() => removeChannel.mutate({ id: c.id, channelId: ch.id })}
                  className="text-gray-400 hover:text-rose-500 ml-1"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={handleSync}
            disabled={sync.isPending || c.channels.length === 0}
            className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-bold disabled:bg-gray-300 hover:bg-emerald-700"
          >
            {sync.isPending ? '동기화 중...' : '↻ 동기화'}
          </button>
          <button
            onClick={handleExtract}
            disabled={extract.isPending || c.contents.length === 0}
            className="rounded-lg bg-indigo-600 text-white px-3 py-1.5 text-xs font-bold disabled:bg-gray-300 hover:bg-indigo-700"
          >
            {extract.isPending ? '분석 중...' : '🤖 주제 추출'}
          </button>
          <button
            onClick={handleDelete}
            className="rounded-lg bg-rose-50 text-rose-700 px-2 py-1.5 text-xs font-bold hover:bg-rose-100"
          >
            삭제
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none px-1"
          >
            ✕
          </button>
        </div>
      </div>

      {c.last_synced_at && (
        <p className="text-[10px] text-gray-400">
          마지막 동기화: {new Date(c.last_synced_at).toLocaleString('ko-KR')}
        </p>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 flex gap-1">
        <button
          onClick={() => setTab('content')}
          className={`px-4 py-2 border-b-2 text-xs font-semibold transition-colors ${
            tab === 'content' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-500'
          }`}
        >
          📄 콘텐츠 ({c.contents.length})
        </button>
        <button
          onClick={() => setTab('topics')}
          className={`px-4 py-2 border-b-2 text-xs font-semibold transition-colors ${
            tab === 'topics' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-500'
          }`}
        >
          🎯 주제 클러스터 ({c.topic_clusters?.length ?? 0})
        </button>
      </div>

      {tab === 'content' && (
        <ContentList items={c.contents} />
      )}

      {tab === 'topics' && (
        <TopicsView clusters={c.topic_clusters ?? []} contents={c.contents} />
      )}
    </div>
  );
}

function ContentList({ items }: { items: CompetitorContent[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-12">
        수집된 콘텐츠가 없습니다. 상단의 "↻ 동기화" 버튼을 눌러주세요.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {items.map((ct) => (
        <a
          key={ct.id}
          href={ct.url}
          target="_blank"
          rel="noreferrer"
          className="bg-white rounded-xl border border-gray-200 p-3 flex gap-3 hover:shadow-md transition-shadow"
        >
          {ct.thumbnailUrl ? (
            <img src={ct.thumbnailUrl} className="w-24 h-16 object-cover rounded-lg flex-shrink-0" />
          ) : (
            <div className="w-24 h-16 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center text-2xl">
              {ct.channelType === 'youtube' ? '🎬' : '📄'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h5 className="text-xs font-bold line-clamp-2">{ct.title}</h5>
            <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
              {ct.publishedAt && <span>{new Date(ct.publishedAt).toLocaleDateString('ko-KR')}</span>}
              {ct.views != null && <span>👁 {fmt(ct.views)}</span>}
              {ct.likes != null && <span>👍 {fmt(ct.likes)}</span>}
              {ct.comments != null && <span>💬 {fmt(ct.comments)}</span>}
            </div>
            {ct.topics && ct.topics.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {ct.topics.slice(0, 3).map((t, i) => (
                  <span key={i} className="rounded-full bg-indigo-50 text-indigo-700 px-1.5 py-0.5 text-[9px] font-semibold">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </a>
      ))}
    </div>
  );
}

function TopicsView({ clusters, contents }: { clusters: string[]; contents: CompetitorContent[] }) {
  if (clusters.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-12">
        아직 주제가 추출되지 않았습니다. 콘텐츠 동기화 후 "🤖 주제 추출" 버튼을 눌러주세요.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {clusters.map((t, i) => {
          const count = contents.filter((c) => c.topics?.includes(t)).length;
          return (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 text-indigo-700 px-3 py-1.5 text-xs font-semibold"
            >
              {t}
              <span className="text-[10px] bg-indigo-200 px-1.5 rounded-full">{count}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
