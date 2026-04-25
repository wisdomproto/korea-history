import { useMemo, useState } from 'react';
import { useEditorStore } from '@/store/editor.store';
import {
  useJobs,
  useCancelJob,
  useRetryJob,
  usePublishNow,
  useDeleteJob,
} from '../hooks/usePublish';
import type { PublishStatus, PublishChannel, PublishJob } from '../types';
import { NewJobModal } from './NewJobModal';

const STATUS_META: Record<PublishStatus, { label: string; color: string }> = {
  scheduled: { label: '예약됨', color: 'bg-sky-100 text-sky-700' },
  publishing: { label: '발행 중', color: 'bg-amber-100 text-amber-700' },
  published: { label: '발행됨', color: 'bg-emerald-100 text-emerald-700' },
  failed: { label: '실패', color: 'bg-rose-100 text-rose-700' },
  cancelled: { label: '취소됨', color: 'bg-gray-100 text-gray-500' },
};

const CHANNEL_META: Record<PublishChannel, { label: string; icon: string }> = {
  instagram: { label: 'Instagram', icon: '📸' },
  wordpress: { label: 'WordPress', icon: '🌐' },
  threads: { label: 'Threads', icon: '🧵' },
  youtube: { label: 'YouTube', icon: '🎬' },
};

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${mm}.${dd} ${hh}:${mi}`;
}

export function PublishView() {
  const projectId = useEditorStore((s) => s.selectedProjectId);
  const [statusFilter, setStatusFilter] = useState<'all' | PublishStatus>('all');
  const [channelFilter, setChannelFilter] = useState<'all' | PublishChannel>('all');
  const [showNewModal, setShowNewModal] = useState(false);

  const { data: jobs = [], isLoading, error, refetch } = useJobs({ projectId });
  const cancel = useCancelJob();
  const retry = useRetryJob();
  const publishNow = usePublishNow();
  const del = useDeleteJob();

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      if (statusFilter !== 'all' && j.status !== statusFilter) return false;
      if (channelFilter !== 'all' && j.channel !== channelFilter) return false;
      return true;
    });
  }, [jobs, statusFilter, channelFilter]);

  const summary = useMemo(() => {
    const s: Record<string, number> = {};
    for (const j of jobs) s[j.status] = (s[j.status] ?? 0) + 1;
    return s;
  }, [jobs]);

  const handleAction = async (job: PublishJob, action: 'cancel' | 'retry' | 'now' | 'delete') => {
    try {
      if (action === 'cancel') await cancel.mutateAsync(job.id);
      else if (action === 'retry') await retry.mutateAsync({ id: job.id });
      else if (action === 'now') await publishNow.mutateAsync(job.id);
      else if (action === 'delete') {
        if (!confirm('이 작업을 완전히 삭제할까요?')) return;
        await del.mutateAsync(job.id);
      }
    } catch (err) {
      alert(`실패: ${(err as Error).message}`);
    }
  };

  const notConfigured = (error as Error | undefined)?.message?.includes('R2');

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900">🚀 발행 큐</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            콘텐츠를 채널별로 예약 · 발행 · 재시도합니다. 서버 크론이 매 분마다 예약 작업을 체크합니다.
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
            onClick={() => setShowNewModal(true)}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
          >
            + 새 발행 예약
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {notConfigured && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 space-y-1">
            <p className="font-bold">⚠️ R2 미설정</p>
            <p>
              발행 큐는 R2 JSON에 저장됩니다. <code className="bg-amber-100 px-1 rounded">R2_ACCOUNT_ID</code>,{' '}
              <code className="bg-amber-100 px-1 rounded">R2_ACCESS_KEY_ID</code>,{' '}
              <code className="bg-amber-100 px-1 rounded">R2_SECRET_ACCESS_KEY</code>를 .env에 설정해주세요.
            </p>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(['scheduled', 'publishing', 'published', 'failed', 'cancelled'] as const).map((s) => {
            const count = summary[s] ?? 0;
            return (
              <div key={s} className={`rounded-xl border p-3 bg-white`}>
                <div className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_META[s].color}`}>
                  {STATUS_META[s].label}
                </div>
                <div className="text-2xl font-extrabold mt-1">{count.toLocaleString()}</div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase">상태</span>
          <button
            onClick={() => setStatusFilter('all')}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              statusFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
            }`}
          >
            전체 {jobs.length}
          </button>
          {(['scheduled', 'publishing', 'published', 'failed', 'cancelled'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                statusFilter === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {STATUS_META[s].label} {summary[s] ?? 0}
            </button>
          ))}
          <div className="w-4" />
          <span className="text-[10px] font-bold text-gray-400 uppercase">채널</span>
          <button
            onClick={() => setChannelFilter('all')}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              channelFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
            }`}
          >
            전체
          </button>
          {(['wordpress', 'instagram'] as const).map((c) => {
            const n = jobs.filter((j) => j.channel === c).length;
            return (
              <button
                key={c}
                onClick={() => setChannelFilter(c)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  channelFilter === c ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {CHANNEL_META[c].icon} {CHANNEL_META[c].label} {n}
              </button>
            );
          })}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="h-60 bg-gray-100 rounded-xl animate-pulse" />
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-sm text-gray-400">
            예약된 발행이 없습니다. <br />
            <button
              onClick={() => setShowNewModal(true)}
              className="mt-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
            >
              + 첫 발행 예약하기
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-[10px] uppercase text-gray-500">
                <tr>
                  <th className="text-left px-3 py-2">예약 시각</th>
                  <th className="text-left px-3 py-2">채널</th>
                  <th className="text-left px-3 py-2">콘텐츠</th>
                  <th className="text-center px-3 py-2">상태</th>
                  <th className="text-left px-3 py-2">결과</th>
                  <th className="text-right px-3 py-2">액션</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((j) => (
                  <tr key={j.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 tabular-nums text-gray-700">
                      {fmtDateTime(j.scheduled_at)}
                      {j.published_at && (
                        <div className="text-[10px] text-emerald-600">
                          ✓ {fmtDateTime(j.published_at)}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1">
                        <span>{CHANNEL_META[j.channel].icon}</span>
                        <span>{CHANNEL_META[j.channel].label}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-800 truncate max-w-xs">
                      {j.content_title || j.content_id}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_META[j.status].color}`}>
                        {STATUS_META[j.status].label}
                      </span>
                      {j.attempts > 1 && (
                        <span className="ml-1 text-[10px] text-gray-400">x{j.attempts}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[11px]">
                      {j.result_url ? (
                        <a
                          href={j.result_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline truncate block max-w-[240px]"
                        >
                          {j.result_url}
                        </a>
                      ) : j.error_message ? (
                        <span className="text-rose-600 text-[10px]" title={j.error_message}>
                          ⚠ {j.error_message.slice(0, 60)}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex gap-1">
                        {j.status === 'scheduled' && (
                          <>
                            <button
                              onClick={() => handleAction(j, 'now')}
                              className="rounded px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            >
                              지금 발행
                            </button>
                            <button
                              onClick={() => handleAction(j, 'cancel')}
                              className="rounded px-2 py-0.5 text-[10px] font-bold bg-gray-100 text-gray-600 hover:bg-gray-200"
                            >
                              취소
                            </button>
                          </>
                        )}
                        {j.status === 'failed' && (
                          <button
                            onClick={() => handleAction(j, 'retry')}
                            className="rounded px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 hover:bg-amber-200"
                          >
                            재시도
                          </button>
                        )}
                        {(j.status === 'cancelled' || j.status === 'failed' || j.status === 'published') && (
                          <button
                            onClick={() => handleAction(j, 'delete')}
                            className="rounded px-2 py-0.5 text-[10px] font-bold bg-rose-50 text-rose-600 hover:bg-rose-100"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <NewJobModal open={showNewModal} onClose={() => setShowNewModal(false)} />
    </div>
  );
}
