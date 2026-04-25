import { useMemo, useState } from 'react';
import { useEditorStore } from '@/store/editor.store';
import { useProjectSettings, useUpdateProjectSettings } from '@/features/settings/hooks/useSettings';
import type { SavedIdea, IdeaStatus, IdeaChannel } from '../types';

const STATUS_META: Record<IdeaStatus, { label: string; color: string; ring: string }> = {
  backlog: { label: '백로그', color: 'bg-gray-100 text-gray-600', ring: 'ring-gray-200' },
  in_progress: { label: '제작 중', color: 'bg-amber-100 text-amber-700', ring: 'ring-amber-300' },
  published: { label: '발행됨', color: 'bg-emerald-100 text-emerald-700', ring: 'ring-emerald-300' },
  archived: { label: '보관', color: 'bg-gray-100 text-gray-400', ring: 'ring-gray-200' },
};

const CHANNEL_META: Record<IdeaChannel, { label: string; icon: string; color: string }> = {
  blog: { label: '블로그', icon: '📖', color: 'bg-green-50 text-green-700' },
  instagram: { label: '카드뉴스', icon: '📸', color: 'bg-rose-50 text-rose-700' },
  threads: { label: '스레드', icon: '🧵', color: 'bg-gray-100 text-gray-700' },
  longform: { label: '롱폼', icon: '🎬', color: 'bg-red-50 text-red-700' },
  shortform: { label: '숏폼', icon: '⚡', color: 'bg-amber-50 text-amber-700' },
};

function PriorityDots({ value }: { value?: number }) {
  const p = Math.max(0, Math.min(5, value ?? 0));
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${i <= p ? 'bg-rose-500' : 'bg-gray-200'}`}
        />
      ))}
    </span>
  );
}

export function IdeaBoardTab() {
  const projectId = useEditorStore((s) => s.selectedProjectId);
  const { data: settings } = useProjectSettings(projectId);
  const updateSettings = useUpdateProjectSettings(projectId);

  const ideas = useMemo(() => settings?.savedIdeas ?? [], [settings]);
  const [filterStatus, setFilterStatus] = useState<'all' | IdeaStatus>('all');
  const [filterChannel, setFilterChannel] = useState<'all' | IdeaChannel>('all');
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return ideas
      .filter((i) => filterStatus === 'all' || i.status === filterStatus)
      .filter((i) => filterChannel === 'all' || i.targetChannel === filterChannel)
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }, [ideas, filterStatus, filterChannel]);

  const counts = useMemo(() => {
    const byStatus: Record<string, number> = {};
    const byChannel: Record<string, number> = {};
    for (const i of ideas) {
      byStatus[i.status] = (byStatus[i.status] ?? 0) + 1;
      if (i.targetChannel) byChannel[i.targetChannel] = (byChannel[i.targetChannel] ?? 0) + 1;
    }
    return { byStatus, byChannel };
  }, [ideas]);

  const updateIdea = (id: string, patch: Partial<SavedIdea>) => {
    updateSettings.mutate({
      savedIdeas: ideas.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    });
  };

  const deleteIdea = (id: string) => {
    if (!confirm('이 아이디어를 삭제할까요?')) return;
    updateSettings.mutate({
      savedIdeas: ideas.filter((i) => i.id !== id),
    });
  };

  const addBlankIdea = () => {
    const newIdea: SavedIdea = {
      id: `idea-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: '새 아이디어',
      keywords: [],
      savedAt: new Date().toISOString(),
      status: 'backlog',
      source: 'manual',
      priority: 3,
    };
    updateSettings.mutate({ savedIdeas: [newIdea, ...ideas] });
    setEditingId(newIdea.id);
  };

  if (ideas.length === 0) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <div className="text-5xl mb-3">💡</div>
        <h3 className="text-base font-bold text-gray-800 mb-1">아이디어가 없습니다</h3>
        <p className="text-xs text-gray-500 mb-4">
          저장 키워드 탭에서 키워드를 선택해 AI로 생성하거나, 직접 추가하세요.
        </p>
        <button
          onClick={addBlankIdea}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
        >
          + 아이디어 직접 추가
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-gray-400 uppercase">상태</span>
          {(['all', 'backlog', 'in_progress', 'published', 'archived'] as const).map((s) => {
            const label = s === 'all' ? `전체 ${ideas.length}` : `${STATUS_META[s].label} ${counts.byStatus[s] ?? 0}`;
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  filterStatus === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-[10px] font-bold text-gray-400 uppercase">채널</span>
          <button
            onClick={() => setFilterChannel('all')}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              filterChannel === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
            }`}
          >
            전체
          </button>
          {(['blog', 'instagram', 'threads', 'longform', 'shortform'] as const).map((c) => {
            const n = counts.byChannel[c] ?? 0;
            if (n === 0) return null;
            return (
              <button
                key={c}
                onClick={() => setFilterChannel(c)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  filterChannel === c ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {CHANNEL_META[c].icon} {CHANNEL_META[c].label} {n}
              </button>
            );
          })}
          <button
            onClick={addBlankIdea}
            className="ml-2 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
          >
            + 추가
          </button>
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((idea) => {
          const isEditing = editingId === idea.id;
          return (
            <div
              key={idea.id}
              className={`rounded-2xl border bg-white p-4 space-y-2 ring-1 ${STATUS_META[idea.status].ring} ${
                idea.status === 'archived' ? 'opacity-60' : ''
              }`}
            >
              {/* Header: channel + priority + actions */}
              <div className="flex items-center gap-2">
                {idea.targetChannel && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${CHANNEL_META[idea.targetChannel].color}`}>
                    {CHANNEL_META[idea.targetChannel].icon} {CHANNEL_META[idea.targetChannel].label}
                  </span>
                )}
                <PriorityDots value={idea.priority} />
                <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_META[idea.status].color}`}>
                  {STATUS_META[idea.status].label}
                </span>
                {idea.source === 'ai' && (
                  <span className="text-[9px] text-indigo-500 font-bold">🤖 AI</span>
                )}
              </div>

              {/* Title */}
              {isEditing ? (
                <input
                  value={idea.title}
                  onChange={(e) => updateIdea(idea.id, { title: e.target.value })}
                  onBlur={() => setEditingId(null)}
                  autoFocus
                  className="w-full text-sm font-bold outline-none border-b border-emerald-400"
                />
              ) : (
                <h4
                  className="text-sm font-bold text-gray-900 cursor-pointer hover:bg-gray-50 rounded px-1"
                  onClick={() => setEditingId(idea.id)}
                >
                  {idea.title}
                </h4>
              )}

              {/* Hook */}
              {idea.hook && (
                <p className="text-xs text-gray-700 italic leading-relaxed">“{idea.hook}”</p>
              )}

              {/* Description */}
              {idea.description && (
                <p className="text-[11px] text-gray-500 leading-relaxed">{idea.description}</p>
              )}

              {/* Keywords */}
              {idea.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {idea.keywords.map((kw, i) => (
                    <span
                      key={`${kw}-${i}`}
                      className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600"
                    >
                      #{kw}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-1 pt-2 border-t border-gray-100">
                <select
                  value={idea.status}
                  onChange={(e) => updateIdea(idea.id, { status: e.target.value as IdeaStatus })}
                  className="text-[10px] border border-gray-200 rounded px-1.5 py-0.5"
                >
                  <option value="backlog">백로그</option>
                  <option value="in_progress">제작 중</option>
                  <option value="published">발행됨</option>
                  <option value="archived">보관</option>
                </select>
                <select
                  value={idea.targetChannel ?? ''}
                  onChange={(e) => updateIdea(idea.id, { targetChannel: (e.target.value || undefined) as IdeaChannel | undefined })}
                  className="text-[10px] border border-gray-200 rounded px-1.5 py-0.5"
                >
                  <option value="">채널 선택</option>
                  <option value="blog">📖 블로그</option>
                  <option value="instagram">📸 카드뉴스</option>
                  <option value="threads">🧵 스레드</option>
                  <option value="longform">🎬 롱폼</option>
                  <option value="shortform">⚡ 숏폼</option>
                </select>
                <button
                  onClick={() => deleteIdea(idea.id)}
                  className="ml-auto text-[10px] text-rose-500 hover:text-rose-700"
                >
                  삭제
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
