import { useState, useEffect } from 'react';
import {
  useAnalyzeComment,
  useReplyComment,
  useIgnoreComment,
  useUpdateDraft,
} from '../hooks/useMonitoring';
import type { MonitoredComment, CommentSentiment, CommentIntent } from '../types';

const CHANNEL_META: Record<string, { icon: string; label: string; color: string }> = {
  instagram: { icon: '📸', label: 'Instagram', color: 'bg-rose-100 text-rose-700' },
  youtube: { icon: '🎬', label: 'YouTube', color: 'bg-red-100 text-red-700' },
  threads: { icon: '🧵', label: 'Threads', color: 'bg-gray-100 text-gray-700' },
  naver_blog: { icon: '📗', label: 'N 블로그', color: 'bg-green-100 text-green-700' },
};

const SENTIMENT_META: Record<CommentSentiment, { label: string; emoji: string; color: string }> = {
  positive: { label: '긍정', emoji: '😊', color: 'bg-emerald-100 text-emerald-700' },
  neutral: { label: '중립', emoji: '😐', color: 'bg-gray-100 text-gray-600' },
  negative: { label: '부정', emoji: '😟', color: 'bg-rose-100 text-rose-700' },
};

const INTENT_LABEL: Record<CommentIntent, string> = {
  question: '질문',
  complaint: '불만',
  compliment: '칭찬',
  spam: '스팸',
  other: '기타',
};

function fmtTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffMin < 60 * 24) return `${Math.round(diffMin / 60)}시간 전`;
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

export function CommentCard({ comment }: { comment: MonitoredComment }) {
  const analyze = useAnalyzeComment();
  const reply = useReplyComment();
  const ignore = useIgnoreComment();
  const updateDraft = useUpdateDraft();

  const [draft, setDraft] = useState(comment.ai_reply_draft ?? '');
  useEffect(() => {
    setDraft(comment.ai_reply_draft ?? '');
  }, [comment.ai_reply_draft]);

  const ch = CHANNEL_META[comment.channel] ?? CHANNEL_META.instagram;
  const sent = comment.sentiment ? SENTIMENT_META[comment.sentiment] : null;

  const handleAnalyze = async () => {
    try {
      await analyze.mutateAsync(comment.id);
    } catch (err) {
      alert(`분석 실패: ${(err as Error).message}`);
    }
  };

  const handleReply = async () => {
    if (!draft.trim()) return;
    if (draft !== (comment.ai_reply_draft ?? '')) {
      await updateDraft.mutateAsync({ id: comment.id, draft });
    }
    try {
      await reply.mutateAsync({ id: comment.id, message: draft.trim() });
    } catch (err) {
      alert(`답글 실패: ${(err as Error).message}`);
    }
  };

  const handleIgnore = async () => {
    await ignore.mutateAsync(comment.id);
  };

  const alreadyReplied = comment.reply_status === 'replied';
  const ignored = comment.reply_status === 'ignored';

  return (
    <div
      className={`rounded-2xl border bg-white p-4 space-y-3 ${
        ignored ? 'opacity-50' : ''
      } ${comment.sentiment === 'negative' ? 'ring-1 ring-rose-200' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 text-xs">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${ch.color}`}>
          <span>{ch.icon}</span>
          <span>{ch.label}</span>
        </span>
        {sent && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${sent.color}`}>
            <span>{sent.emoji}</span>
            <span>{sent.label}</span>
            {comment.sentiment_confidence != null && (
              <span className="text-[9px] opacity-70">
                {Math.round(comment.sentiment_confidence * 100)}%
              </span>
            )}
          </span>
        )}
        {comment.intent && (
          <span className="rounded-full px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-semibold">
            {INTENT_LABEL[comment.intent]}
          </span>
        )}
        <span className="ml-auto text-[10px] text-gray-400">
          {fmtTime(comment.created_at_external)}
        </span>
      </div>

      {/* Post reference */}
      {comment.post_title && (
        <div className="text-[10px] text-gray-500">
          {comment.post_url ? (
            <a href={comment.post_url} target="_blank" rel="noreferrer" className="hover:underline">
              ↗ {comment.post_title.slice(0, 80)}
            </a>
          ) : (
            <span>{comment.post_title.slice(0, 80)}</span>
          )}
        </div>
      )}

      {/* Comment body */}
      <div className="space-y-1">
        <div className="flex items-center gap-1 text-[11px] font-bold text-gray-700">
          @{comment.author}
          {comment.like_count > 0 && (
            <span className="ml-auto text-gray-400 font-normal">♥ {comment.like_count}</span>
          )}
        </div>
        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{comment.text}</p>
      </div>

      {/* Actions / AI */}
      {!alreadyReplied && !ignored && (
        <div className="pt-2 border-t border-gray-100 space-y-2">
          {!comment.ai_reply_draft ? (
            <button
              onClick={handleAnalyze}
              disabled={analyze.isPending}
              className="w-full rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold py-2 hover:bg-indigo-100 disabled:bg-gray-100 disabled:text-gray-400"
            >
              {analyze.isPending ? '분석 중...' : '🤖 감정 분석 + 답글 초안 생성'}
            </button>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-indigo-500 uppercase">AI 답글 초안</span>
                <button
                  onClick={handleAnalyze}
                  disabled={analyze.isPending}
                  className="text-[10px] text-gray-400 hover:text-gray-600"
                >
                  {analyze.isPending ? '재생성 중...' : '↻ 재생성'}
                </button>
              </div>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-y"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleIgnore}
                  disabled={ignore.isPending}
                  className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold hover:bg-gray-50"
                >
                  무시
                </button>
                <button
                  onClick={handleReply}
                  disabled={!draft.trim() || reply.isPending}
                  className="rounded-lg bg-emerald-600 text-white px-3 py-1 text-xs font-bold disabled:bg-gray-300 hover:bg-emerald-700"
                >
                  {reply.isPending ? '전송 중...' : '답글 전송'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {alreadyReplied && comment.reply_text && (
        <div className="pt-2 border-t border-gray-100 space-y-1">
          <div className="text-[10px] font-bold text-emerald-600 uppercase">✓ 답글 완료</div>
          <p className="text-xs text-gray-700 bg-emerald-50 rounded-lg p-2">{comment.reply_text}</p>
          <p className="text-[10px] text-gray-400">
            {comment.replied_at && new Date(comment.replied_at).toLocaleString('ko-KR')}
          </p>
        </div>
      )}

      {ignored && (
        <div className="pt-2 border-t border-gray-100 text-[10px] text-gray-400">무시된 댓글</div>
      )}
    </div>
  );
}
