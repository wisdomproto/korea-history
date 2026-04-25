import { useMemo, useState } from 'react';
import { useEditorStore } from '@/store/editor.store';
import { useProjectSettings, useUpdateProjectSettings } from '@/features/settings/hooks/useSettings';
import { useGenerateIdeas } from '../hooks/useIdeas';
import type {
  SavedKeyword,
  KeywordStatus,
  KeywordSource,
  IdeaChannel,
  SavedIdea,
} from '../types';

const STATUS_LABELS: Record<KeywordStatus, { label: string; color: string }> = {
  backlog: { label: '백로그', color: 'bg-gray-100 text-gray-600' },
  exploring: { label: '탐색', color: 'bg-amber-100 text-amber-700' },
  in_content: { label: '콘텐츠 반영', color: 'bg-emerald-100 text-emerald-700' },
  archived: { label: '보관', color: 'bg-gray-100 text-gray-400' },
};

const SOURCE_LABELS: Record<KeywordSource, string> = {
  naver: '🟢 Naver',
  gsc: '🔍 GSC',
  manual: '✍️ 수동',
  ai: '🤖 AI',
};

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function SavedKeywordsTab({ onJumpToIdeas }: { onJumpToIdeas?: () => void }) {
  const projectId = useEditorStore((s) => s.selectedProjectId);
  const { data: settings } = useProjectSettings(projectId);
  const updateSettings = useUpdateProjectSettings(projectId);
  const generate = useGenerateIdeas();

  const keywords = useMemo(() => settings?.savedKeywords ?? [], [settings]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterSource, setFilterSource] = useState<'all' | KeywordSource>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | KeywordStatus>('all');
  const [showGenerator, setShowGenerator] = useState(false);
  const [genChannel, setGenChannel] = useState<IdeaChannel | 'auto'>('auto');
  const [genCount, setGenCount] = useState(8);
  const [genInstruction, setGenInstruction] = useState('');

  const filtered = useMemo(() => {
    return keywords.filter((k) => {
      if (filterSource !== 'all' && k.source !== filterSource) return false;
      if (filterStatus !== 'all' && k.status !== filterStatus) return false;
      return true;
    });
  }, [keywords, filterSource, filterStatus]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((k) => k.id)));
  };

  const deleteSelected = () => {
    if (selected.size === 0) return;
    if (!confirm(`선택한 ${selected.size}개 키워드를 삭제할까요?`)) return;
    updateSettings.mutate({
      savedKeywords: keywords.filter((k) => !selected.has(k.id)),
    });
    setSelected(new Set());
  };

  const setStatusForSelected = (status: KeywordStatus) => {
    if (selected.size === 0) return;
    updateSettings.mutate({
      savedKeywords: keywords.map((k) => (selected.has(k.id) ? { ...k, status } : k)),
    });
  };

  const handleGenerate = async () => {
    const terms = keywords.filter((k) => selected.has(k.id)).map((k) => k.term);
    if (terms.length === 0) return;
    try {
      const ideas = await generate.mutateAsync({
        projectId,
        keywords: terms,
        count: genCount,
        channel: genChannel === 'auto' ? undefined : genChannel,
        instruction: genInstruction.trim() || undefined,
      });
      // Save ideas to project
      const existing = settings?.savedIdeas ?? [];
      const newIdeas: SavedIdea[] = ideas.map((i) => ({
        id: makeId('idea'),
        title: i.title,
        hook: i.hook,
        description: i.description,
        keywords: i.keywords,
        targetChannel: i.targetChannel,
        priority: i.priority,
        savedAt: new Date().toISOString(),
        status: 'backlog',
        source: 'ai',
      }));
      // Also mark used keywords as exploring
      const touchedTerms = new Set(terms.map((t) => t.toLowerCase()));
      const nextKeywords = keywords.map((k) =>
        touchedTerms.has(k.term.toLowerCase()) && k.status === 'backlog'
          ? { ...k, status: 'exploring' as KeywordStatus }
          : k
      );
      updateSettings.mutate({
        savedIdeas: [...newIdeas, ...existing],
        savedKeywords: nextKeywords,
      });
      setShowGenerator(false);
      setSelected(new Set());
      onJumpToIdeas?.();
    } catch (err) {
      alert(`아이디어 생성 실패: ${(err as Error).message}`);
    }
  };

  const counts = useMemo(() => {
    const bySource: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const k of keywords) {
      bySource[k.source] = (bySource[k.source] ?? 0) + 1;
      byStatus[k.status] = (byStatus[k.status] ?? 0) + 1;
    }
    return { bySource, byStatus };
  }, [keywords]);

  if (keywords.length === 0) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <div className="text-5xl mb-3">⭐</div>
        <h3 className="text-base font-bold text-gray-800 mb-1">저장된 키워드가 없습니다</h3>
        <p className="text-xs text-gray-500">
          <span className="font-bold">🔍 키워드 리서치</span> 탭에서 키워드를 검색하고 저장해보세요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-gray-400 uppercase">소스</span>
          <button
            onClick={() => setFilterSource('all')}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              filterSource === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
            }`}
          >
            전체 {keywords.length}
          </button>
          {(['naver', 'gsc', 'manual', 'ai'] as const).map((s) => {
            const c = counts.bySource[s] ?? 0;
            if (c === 0) return null;
            return (
              <button
                key={s}
                onClick={() => setFilterSource(s)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  filterSource === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {SOURCE_LABELS[s]} {c}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-[10px] font-bold text-gray-400 uppercase">상태</span>
          <button
            onClick={() => setFilterStatus('all')}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              filterStatus === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
            }`}
          >
            전체
          </button>
          {(['backlog', 'exploring', 'in_content', 'archived'] as const).map((s) => {
            const c = counts.byStatus[s] ?? 0;
            if (c === 0) return null;
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  filterStatus === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {STATUS_LABELS[s].label} {c}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
          <span className="text-xs font-bold text-emerald-700">{selected.size}개 선택됨</span>
          <button
            onClick={() => setShowGenerator(true)}
            className="ml-auto rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700"
          >
            🤖 AI 아이디어 생성
          </button>
          <div className="flex items-center gap-1 border-l border-emerald-200 pl-2">
            {(['backlog', 'exploring', 'in_content', 'archived'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusForSelected(s)}
                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold hover:opacity-80 ${STATUS_LABELS[s].color}`}
                title={`${STATUS_LABELS[s].label}로 변경`}
              >
                {STATUS_LABELS[s].label}
              </button>
            ))}
          </div>
          <button
            onClick={deleteSelected}
            className="rounded-lg bg-rose-100 text-rose-700 px-2.5 py-1 text-xs font-bold hover:bg-rose-200"
          >
            삭제
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-[10px] uppercase text-gray-500">
            <tr>
              <th className="text-left px-3 py-2 w-8">
                <input
                  type="checkbox"
                  onChange={selectAll}
                  checked={filtered.length > 0 && selected.size === filtered.length}
                />
              </th>
              <th className="text-left px-3 py-2">키워드</th>
              <th className="text-center px-3 py-2">소스</th>
              <th className="text-center px-3 py-2">상태</th>
              <th className="text-right px-3 py-2">검색량</th>
              <th className="text-right px-3 py-2">GSC 클릭/노출</th>
              <th className="text-right px-3 py-2">경쟁/순위</th>
              <th className="text-right px-3 py-2">저장일</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((k) => (
              <tr key={k.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(k.id)}
                    onChange={() => toggleSelect(k.id)}
                  />
                </td>
                <td className="px-3 py-2 font-medium text-gray-800">{k.term}</td>
                <td className="px-3 py-2 text-center">
                  <span className="text-[10px] text-gray-600">{SOURCE_LABELS[k.source]}</span>
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_LABELS[k.status].color}`}>
                    {STATUS_LABELS[k.status].label}
                  </span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {k.volume != null ? k.volume.toLocaleString() : '—'}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {k.gscImpressions != null
                    ? `${(k.gscClicks ?? 0).toLocaleString()} / ${k.gscImpressions.toLocaleString()}`
                    : '—'}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {k.competition ?? (k.gscPosition != null ? `#${k.gscPosition}` : '—')}
                </td>
                <td className="px-3 py-2 text-right text-gray-400">
                  {new Date(k.savedAt).toLocaleDateString('ko-KR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Generate modal */}
      {showGenerator && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowGenerator(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-extrabold">🤖 AI로 콘텐츠 아이디어 생성</h3>
            <p className="text-xs text-gray-500">
              선택한 {selected.size}개 키워드 + 프로젝트 브랜드 컨텍스트를 활용해 Gemini가 아이디어를 제안합니다.
            </p>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">타겟 채널</label>
                  <select
                    value={genChannel}
                    onChange={(e) => setGenChannel(e.target.value as IdeaChannel | 'auto')}
                    className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
                  >
                    <option value="auto">자동 (AI가 판단)</option>
                    <option value="blog">네이버 블로그</option>
                    <option value="instagram">인스타 카드뉴스</option>
                    <option value="threads">스레드</option>
                    <option value="longform">YouTube 롱폼</option>
                    <option value="shortform">YouTube 숏폼</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">생성 개수</label>
                  <select
                    value={genCount}
                    onChange={(e) => setGenCount(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
                  >
                    <option value={5}>5개</option>
                    <option value={8}>8개</option>
                    <option value={10}>10개</option>
                    <option value={15}>15개</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">추가 지시 (선택)</label>
                <textarea
                  value={genInstruction}
                  onChange={(e) => setGenInstruction(e.target.value)}
                  rows={3}
                  placeholder="예: 7~9월 시험 시즌 겨냥, 초보 수험생 대상"
                  className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setShowGenerator(false)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold"
              >
                취소
              </button>
              <button
                onClick={handleGenerate}
                disabled={generate.isPending}
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white disabled:bg-gray-300 hover:bg-emerald-700"
              >
                {generate.isPending ? '생성 중...' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
