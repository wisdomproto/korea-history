import { useEffect, useState } from 'react';
import { useEditorStore } from '@/store/editor.store';
import { useCreateCompetitor } from '../hooks/useCompetitors';
import type { CompetitorChannelType } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
}

const CHANNEL_TYPES: Array<{ key: CompetitorChannelType; label: string; placeholder: string }> = [
  { key: 'website', label: '🌐 웹사이트', placeholder: 'https://example.com' },
  { key: 'blog', label: '📗 블로그', placeholder: 'https://blog.naver.com/xxx' },
  { key: 'youtube', label: '🎬 YouTube', placeholder: 'https://www.youtube.com/@handle 또는 /channel/UC...' },
  { key: 'instagram', label: '📸 Instagram', placeholder: 'https://www.instagram.com/username' },
  { key: 'threads', label: '🧵 Threads', placeholder: 'https://www.threads.net/@handle' },
];

interface ChannelDraft {
  type: CompetitorChannelType;
  url: string;
}

export function AddCompetitorModal({ open, onClose, onCreated }: Props) {
  const projectId = useEditorStore((s) => s.selectedProjectId);
  const create = useCreateCompetitor();

  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [channels, setChannels] = useState<ChannelDraft[]>([{ type: 'website', url: '' }]);

  useEffect(() => {
    if (open) {
      setName('');
      setNotes('');
      setChannels([{ type: 'website', url: '' }]);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!name.trim()) return alert('경쟁사 이름을 입력하세요');
    const validChannels = channels.filter((c) => c.url.trim());
    try {
      const c = await create.mutateAsync({
        projectId,
        name: name.trim(),
        notes: notes.trim() || undefined,
        channels: validChannels.map((ch) => ({ type: ch.type, url: ch.url.trim() })),
      });
      onCreated?.(c.id);
      onClose();
    } catch (err) {
      alert(`생성 실패: ${(err as Error).message}`);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-extrabold">+ 새 경쟁사</h3>

        <div className="space-y-3">
          <Field label="이름" required>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 한국사스토리텔러 / 큰별쌤 / 경쟁 학원"
              className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
            />
          </Field>

          <Field label="메모">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="포지셔닝 · 강점 · 주의할 점"
              className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
            />
          </Field>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-gray-700">채널</span>
              <button
                onClick={() => setChannels([...channels, { type: 'website', url: '' }])}
                className="text-[10px] text-emerald-600 font-bold hover:text-emerald-700"
              >
                + 추가
              </button>
            </div>
            <div className="space-y-2">
              {channels.map((ch, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select
                    value={ch.type}
                    onChange={(e) => {
                      const next = [...channels];
                      next[i] = { ...next[i], type: e.target.value as CompetitorChannelType };
                      setChannels(next);
                    }}
                    className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
                  >
                    {CHANNEL_TYPES.map((t) => (
                      <option key={t.key} value={t.key}>{t.label}</option>
                    ))}
                  </select>
                  <input
                    value={ch.url}
                    onChange={(e) => {
                      const next = [...channels];
                      next[i] = { ...next[i], url: e.target.value };
                      setChannels(next);
                    }}
                    placeholder={CHANNEL_TYPES.find((t) => t.key === ch.type)?.placeholder}
                    className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
                  />
                  {channels.length > 1 && (
                    <button
                      onClick={() => setChannels(channels.filter((_, idx) => idx !== i))}
                      className="text-rose-500 hover:text-rose-700 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">
              YouTube · 블로그(RSS 지원 사이트)는 자동 동기화됩니다. Instagram · Threads는 수동 트래킹.
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
            disabled={create.isPending}
            className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white disabled:bg-gray-300 hover:bg-emerald-700"
          >
            {create.isPending ? '추가 중...' : '추가'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="block text-[11px] font-semibold text-gray-700">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}
