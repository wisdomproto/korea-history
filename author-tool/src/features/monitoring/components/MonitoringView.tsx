import { useState } from 'react';
import { useEditorStore } from '@/store/editor.store';
import {
  useComments,
  useCommentSummary,
  useSyncComments,
  useAnalyzeBatch,
} from '../hooks/useMonitoring';
import type { CommentChannel, CommentSentiment, ReplyStatus } from '../types';
import { CommentCard } from './CommentCard';

const STATUS_LABEL: Record<ReplyStatus, string> = {
  new: '신규',
  drafted: '초안 완료',
  approved: '승인됨',
  replied: '답글 완료',
  ignored: '무시',
};

const CHANNEL_LABEL: Record<CommentChannel, string> = {
  instagram: '📸 Instagram',
  youtube: '🎬 YouTube',
  threads: '🧵 Threads',
  naver_blog: '📗 N 블로그',
};

const SENTIMENT_LABEL: Record<CommentSentiment | 'unknown', { label: string; color: string }> = {
  positive: { label: '긍정', color: 'bg-emerald-100 text-emerald-700' },
  neutral: { label: '중립', color: 'bg-gray-100 text-gray-600' },
  negative: { label: '부정', color: 'bg-rose-100 text-rose-700' },
  unknown: { label: '미분석', color: 'bg-gray-100 text-gray-400' },
};

export function MonitoringView() {
  const projectId = useEditorStore((s) => s.selectedProjectId);
  const [channelFilter, setChannelFilter] = useState<'all' | CommentChannel>('all');
  const [sentimentFilter, setSentimentFilter] = useState<'all' | CommentSentiment>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ReplyStatus>('all');

  const { data: comments = [], isLoading, error, refetch } = useComments({
    projectId,
    channel: channelFilter === 'all' ? undefined : channelFilter,
    sentiment: sentimentFilter === 'all' ? undefined : sentimentFilter,
    replyStatus: statusFilter === 'all' ? undefined : statusFilter,
  });
  const { data: summary } = useCommentSummary(projectId);
  const sync = useSyncComments();
  const analyzeBatch = useAnalyzeBatch();

  const notConfigured = (error as Error | undefined)?.message?.includes('R2');

  const handleSync = async () => {
    try {
      const result = await sync.mutateAsync({ projectId });
      const msg = result.map((r) => `${r.channel}: ${r.created}개 신규 / ${r.updated}개 갱신${r.message ? ` (${r.message})` : ''}`).join('\n');
      if (msg) alert(`동기화 완료:\n${msg}`);
    } catch (err) {
      alert(`동기화 실패: ${(err as Error).message}`);
    }
  };

  const handleAnalyzeBatch = async () => {
    try {
      const r = await analyzeBatch.mutateAsync({ projectId, limit: 20 });
      alert(`AI 일괄 분석 완료: 처리 ${r.processed}건 / 성공 ${r.done} / 실패 ${r.failed}`);
    } catch (err) {
      alert(`실패: ${(err as Error).message}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900">💬 모니터링 · 댓글</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            각 채널 댓글을 한 화면에서 확인 · Gemini 감정 분석 + 브랜드 톤 답글 초안
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAnalyzeBatch}
            disabled={analyzeBatch.isPending || !summary?.byStatus.new}
            className="rounded-lg bg-indigo-600 text-white px-3 py-1.5 text-xs font-bold disabled:bg-gray-300 hover:bg-indigo-700"
            title="'신규' 댓글에 일괄 AI 분석"
          >
            {analyzeBatch.isPending ? '분석 중...' : `🤖 신규 ${summary?.byStatus.new ?? 0}개 일괄 분석`}
          </button>
          <button
            onClick={handleSync}
            disabled={sync.isPending}
            className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-bold disabled:bg-gray-300 hover:bg-emerald-700"
          >
            {sync.isPending ? '동기화 중...' : '↻ 채널 동기화'}
          </button>
          <button
            onClick={() => refetch()}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold hover:bg-gray-50"
          >
            새로고침
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {notConfigured && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
            ⚠️ R2가 설정되지 않았습니다. 모니터링 데이터는 R2 JSON에 저장됩니다.
          </div>
        )}

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            <SummaryCard label="총 댓글" value={summary.total} color="bg-white" />
            <SummaryCard
              label="신규"
              value={summary.byStatus.new}
              color="bg-sky-50 text-sky-700"
              accent
            />
            <SummaryCard
              label="부정"
              value={summary.bySentiment.negative}
              color="bg-rose-50 text-rose-700"
              accent
            />
            <SummaryCard
              label="답글 완료"
              value={summary.byStatus.replied}
              color="bg-emerald-50 text-emerald-700"
              accent
            />
            <SummaryCard
              label="미분석"
              value={summary.bySentiment.unknown}
              color="bg-gray-50 text-gray-500"
              accent
            />
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border border-gray-200 p-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase">채널</span>
            <button
              onClick={() => setChannelFilter('all')}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                channelFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              전체
            </button>
            {(['instagram', 'youtube', 'threads', 'naver_blog'] as const).map((c) => {
              const n = summary?.byChannel[c] ?? 0;
              if (n === 0) return null;
              return (
                <button
                  key={c}
                  onClick={() => setChannelFilter(c)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    channelFilter === c ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {CHANNEL_LABEL[c]} {n}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase">감정</span>
            <button
              onClick={() => setSentimentFilter('all')}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                sentimentFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              전체
            </button>
            {(['positive', 'neutral', 'negative'] as const).map((s) => {
              const n = summary?.bySentiment[s] ?? 0;
              return (
                <button
                  key={s}
                  onClick={() => setSentimentFilter(s)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    sentimentFilter === s ? 'bg-gray-900 text-white' : SENTIMENT_LABEL[s].color
                  }`}
                >
                  {SENTIMENT_LABEL[s].label} {n}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[10px] font-bold text-gray-400 uppercase">상태</span>
            <button
              onClick={() => setStatusFilter('all')}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                statusFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              전체
            </button>
            {(['new', 'drafted', 'replied', 'ignored'] as const).map((s) => {
              const n = summary?.byStatus[s] ?? 0;
              if (n === 0 && s !== 'new') return null;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    statusFilter === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {STATUS_LABEL[s]} {n}
                </button>
              );
            })}
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="h-60 bg-gray-100 rounded-xl animate-pulse" />
        ) : comments.length === 0 ? (
          <div className="text-center py-16 text-sm text-gray-400">
            {summary?.total === 0
              ? '아직 수집된 댓글이 없습니다. "↻ 채널 동기화"를 눌러 가져오세요.'
              : '조건에 맞는 댓글이 없습니다.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {comments.map((c) => (
              <CommentCard key={c.id} comment={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: number;
  color?: string;
  accent?: boolean;
}

function SummaryCard({ label, value, color = 'bg-white', accent }: SummaryCardProps) {
  return (
    <div className={`rounded-xl border p-3 ${color}`}>
      <div className={`text-[10px] font-bold ${accent ? '' : 'text-gray-500'} uppercase`}>{label}</div>
      <div className="text-2xl font-extrabold mt-1">{value.toLocaleString()}</div>
    </div>
  );
}
