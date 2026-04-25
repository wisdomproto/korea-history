import { useEffect, useMemo, useState } from 'react';
import { useEditorStore } from '@/store/editor.store';
import { useContents, useContent } from '@/features/content/hooks/useContent';
import { useCreateJob } from '../hooks/usePublish';
import type { PublishChannel } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
}

const CHANNELS: Array<{ key: PublishChannel; label: string; icon: string; note?: string }> = [
  { key: 'wordpress', label: 'WordPress', icon: '🌐', note: '블로그 → HTML 본문으로 발행' },
  { key: 'instagram', label: 'Instagram', icon: '📸', note: '카드뉴스 → 캐러셀 발행' },
];

function pad(n: number) { return String(n).padStart(2, '0'); }

function defaultScheduledAt(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 10);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function NewJobModal({ open, onClose }: Props) {
  const projectId = useEditorStore((s) => s.selectedProjectId);
  const { data: contents } = useContents(projectId);
  const [contentId, setContentId] = useState<string>('');
  const [channel, setChannel] = useState<PublishChannel>('wordpress');
  const [scheduledAt, setScheduledAt] = useState<string>(defaultScheduledAt());
  const createJob = useCreateJob();
  const { data: contentFile } = useContent(contentId || null);

  useEffect(() => {
    if (open) {
      setScheduledAt(defaultScheduledAt());
      setContentId('');
      setChannel('wordpress');
    }
  }, [open]);

  const contentTitle = useMemo(() => {
    if (contentFile?.content) return contentFile.content.title;
    return contents?.find((c) => c.id === contentId)?.title ?? '';
  }, [contentId, contents, contentFile]);

  const canSubmit = !!contentId && !!channel && !!scheduledAt && !createJob.isPending;

  const buildPayload = () => {
    if (!contentFile) return {};
    if (channel === 'wordpress') {
      const blog = contentFile.blog?.[0];
      const baseHtml = contentFile.baseArticle?.html ?? '';
      const html = blog
        ? blog.cards
            .map((c) => {
              if (c.type === 'image' && c.imageUrl) return `<figure><img src="${c.imageUrl}" /></figure>`;
              if (c.type === 'quote') return `<blockquote>${c.content}</blockquote>`;
              if (c.type === 'divider') return '<hr/>';
              if (c.type === 'list') return c.content;
              return `<p>${(c.content || '').replace(/\n/g, '<br/>')}</p>`;
            })
            .join('\n')
        : baseHtml;
      return {
        title: blog?.title || contentFile.content.title,
        html,
        status: 'publish',
      };
    }
    if (channel === 'instagram') {
      const ig = contentFile.instagram?.[0];
      const slides = ig?.slides ?? [];
      const imageUrls = slides.map((s) => s.imageUrl).filter(Boolean) as string[];
      const caption = [
        ig?.caption,
        ig?.hashtags?.map((h: string) => `#${h}`).join(' '),
      ]
        .filter(Boolean)
        .join('\n\n');
      return { imageUrls, caption };
    }
    return {};
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      const payload = buildPayload();
      if (channel === 'instagram' && !(payload as { imageUrls?: string[] }).imageUrls?.length) {
        alert('카드뉴스 이미지가 먼저 생성되어 있어야 합니다. 카드뉴스 탭에서 전체 이미지를 생성한 뒤 다시 시도해주세요.');
        return;
      }
      if (channel === 'wordpress' && !(payload as { html?: string }).html) {
        alert('기본글 또는 블로그 카드가 비어있습니다.');
        return;
      }
      await createJob.mutateAsync({
        projectId,
        contentId,
        contentTitle,
        channel,
        scheduledAt: new Date(scheduledAt).toISOString(),
        payload,
      });
      onClose();
    } catch (err) {
      alert(`생성 실패: ${(err as Error).message}`);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-extrabold">🚀 새 발행 예약</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">콘텐츠</label>
            <select
              value={contentId}
              onChange={(e) => setContentId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-2 py-2 text-xs"
            >
              <option value="">콘텐츠를 선택하세요</option>
              {(contents ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">채널</label>
            <div className="grid grid-cols-2 gap-2">
              {CHANNELS.map((c) => {
                const active = channel === c.key;
                return (
                  <button
                    key={c.key}
                    onClick={() => setChannel(c.key)}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      active
                        ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-300'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-lg">{c.icon}</div>
                    <div className="text-sm font-bold mt-0.5">{c.label}</div>
                    {c.note && <div className="text-[10px] text-gray-500 mt-0.5">{c.note}</div>}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              Threads · YouTube는 추후 추가 예정입니다.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">발행 시각</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-2 py-2 text-xs"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              서버 크론이 매 분마다 예약된 작업을 확인합니다. 지금 시점으로 지정하면 1분 이내 발행됩니다.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white disabled:bg-gray-300 hover:bg-emerald-700"
          >
            {createJob.isPending ? '생성 중...' : '예약'}
          </button>
        </div>
      </div>
    </div>
  );
}
