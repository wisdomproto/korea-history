import { useState } from 'react';
import { useEditorStore } from '@/store/editor.store';
import { useProjectSettings, useUpdateProjectSettings } from '@/features/settings/hooks/useSettings';
import { useResearchKeywords, useGscOpportunities } from '../hooks/useIdeas';
import type { NaverKeywordRow, GscOpportunity, SavedKeyword } from '../types';

function compBadge(comp: string) {
  const c = comp.toUpperCase();
  if (c.includes('LOW')) return 'bg-emerald-100 text-emerald-700';
  if (c.includes('MEDIUM') || c.includes('MID')) return 'bg-amber-100 text-amber-700';
  if (c.includes('HIGH')) return 'bg-rose-100 text-rose-700';
  return 'bg-gray-100 text-gray-600';
}

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function KeywordResearchTab() {
  const projectId = useEditorStore((s) => s.selectedProjectId);
  const { data: settings } = useProjectSettings(projectId);
  const savedKeywords = settings?.savedKeywords ?? [];
  const updateSettings = useUpdateProjectSettings(projectId);

  const research = useResearchKeywords();
  const gscMut = useGscOpportunities();

  const [seed, setSeed] = useState('');
  const [source, setSource] = useState<'naver' | 'gsc'>('naver');
  const [gscDays, setGscDays] = useState(30);

  const doResearch = async () => {
    if (!seed.trim()) return;
    const context = [settings?.brand?.description, settings?.brand?.usp]
      .filter(Boolean)
      .join('\n');
    research.mutate({ seed: seed.trim(), context: context || undefined, limit: 15 });
  };

  const doGsc = async () => {
    gscMut.mutate({
      start: isoDaysAgo(gscDays),
      end: isoDaysAgo(3), // GSC lag
      minImpressions: 5,
      maxPosition: 50,
    });
  };

  const saveTerm = (term: string, extra: Partial<SavedKeyword>) => {
    const existing = savedKeywords.find((k) => k.term.toLowerCase() === term.toLowerCase());
    if (existing) {
      // Merge with new data
      const merged: SavedKeyword = { ...existing, ...extra };
      const next = savedKeywords.map((k) => (k.id === existing.id ? merged : k));
      updateSettings.mutate({ savedKeywords: next });
      return;
    }
    const kw: SavedKeyword = {
      id: makeId('kw'),
      term,
      source: extra.source ?? 'manual',
      savedAt: new Date().toISOString(),
      status: 'backlog',
      ...extra,
    };
    updateSettings.mutate({ savedKeywords: [...savedKeywords, kw] });
  };

  const isSaved = (term: string) =>
    savedKeywords.some((k) => k.term.toLowerCase() === term.toLowerCase());

  const naverRows: NaverKeywordRow[] = (research.data?.keywords ?? []).slice().sort(
    (a, b) => b.totalSearchVolume - a.totalSearchVolume
  );
  const gscRows: GscOpportunity[] = gscMut.data?.queries ?? [];

  return (
    <div className="space-y-6">
      {/* Source toggle */}
      <div className="inline-flex rounded-full bg-gray-100 p-1">
        {(['naver', 'gsc'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSource(s)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              source === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {s === 'naver' ? '🟢 Naver 키워드 리서치' : '🔍 GSC 실측 검색어'}
          </button>
        ))}
      </div>

      {/* Naver */}
      {source === 'naver' && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doResearch()}
              placeholder="시드 키워드 입력 (예: 한능검 공부법)"
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
            <button
              onClick={doResearch}
              disabled={!seed.trim() || research.isPending}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-emerald-700"
            >
              {research.isPending ? '리서치 중...' : 'AI + Naver 리서치'}
            </button>
          </div>
          <p className="text-[11px] text-gray-500">
            Gemini가 연관 키워드를 제안한 뒤, Naver 검색광고 API에서 월간 검색량·경쟁률을 함께 가져옵니다.
          </p>

          {research.isError && (
            <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              실패: {(research.error as Error).message}
            </div>
          )}

          {naverRows.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-[10px] uppercase text-gray-500">
                  <tr>
                    <th className="text-left px-3 py-2">키워드</th>
                    <th className="text-right px-3 py-2">월간 검색량</th>
                    <th className="text-center px-3 py-2">경쟁</th>
                    <th className="text-right px-3 py-2">PC</th>
                    <th className="text-right px-3 py-2">Mobile</th>
                    <th className="text-center px-3 py-2 w-20">저장</th>
                  </tr>
                </thead>
                <tbody>
                  {naverRows.map((r) => {
                    const saved = isSaved(r.keyword);
                    return (
                      <tr key={r.keyword} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-800">{r.keyword}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-bold">
                          {r.totalSearchVolume.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${compBadge(r.competition)}`}>
                            {r.competition}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-500">
                          {r.pcSearchVolume.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-500">
                          {r.mobileSearchVolume.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() =>
                              saveTerm(r.keyword, {
                                source: 'naver',
                                volume: r.totalSearchVolume,
                                pcVolume: r.pcSearchVolume,
                                mobileVolume: r.mobileSearchVolume,
                                competition: r.competition,
                              })
                            }
                            className={`rounded px-2 py-0.5 text-[10px] font-bold transition-colors ${
                              saved
                                ? 'bg-emerald-100 text-emerald-700 cursor-default'
                                : 'bg-gray-100 text-gray-600 hover:bg-emerald-100 hover:text-emerald-700'
                            }`}
                            disabled={saved}
                          >
                            {saved ? '✓ 저장됨' : '+ 저장'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* GSC */}
      {source === 'gsc' && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <select
              value={gscDays}
              onChange={(e) => setGscDays(Number(e.target.value))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs"
            >
              <option value={14}>최근 14일</option>
              <option value={30}>최근 30일</option>
              <option value={90}>최근 90일</option>
            </select>
            <button
              onClick={doGsc}
              disabled={gscMut.isPending}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white disabled:bg-gray-300 hover:bg-indigo-700"
            >
              {gscMut.isPending ? '불러오는 중...' : 'GSC 실측 검색어 불러오기'}
            </button>
          </div>
          <p className="text-[11px] text-gray-500">
            Google Search Console에서 실제로 사이트에 검색 노출된 쿼리를 가져옵니다. 노출 ≥5, 순위 ≤50 필터.
          </p>

          {gscMut.isError && (
            <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              실패: {(gscMut.error as Error).message}
            </div>
          )}

          {gscMut.data === null && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Search Console 연동이 필요합니다. 프로젝트 설정 → API·연동 탭에서 확인하세요.
            </div>
          )}

          {gscRows.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-[10px] uppercase text-gray-500">
                  <tr>
                    <th className="text-left px-3 py-2">검색어</th>
                    <th className="text-right px-3 py-2">클릭</th>
                    <th className="text-right px-3 py-2">노출</th>
                    <th className="text-right px-3 py-2">CTR</th>
                    <th className="text-right px-3 py-2">순위</th>
                    <th className="text-center px-3 py-2 w-20">저장</th>
                  </tr>
                </thead>
                <tbody>
                  {gscRows.slice(0, 50).map((r, i) => {
                    const saved = isSaved(r.query);
                    return (
                      <tr key={`${r.query}-${i}`} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-800">{r.query}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-blue-600">
                          {r.clicks.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-purple-600">
                          {r.impressions.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-emerald-600">
                          {r.ctr}%
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-amber-600">
                          #{r.position}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() =>
                              saveTerm(r.query, {
                                source: 'gsc',
                                gscClicks: r.clicks,
                                gscImpressions: r.impressions,
                                gscCtr: r.ctr,
                                gscPosition: r.position,
                              })
                            }
                            className={`rounded px-2 py-0.5 text-[10px] font-bold transition-colors ${
                              saved
                                ? 'bg-emerald-100 text-emerald-700 cursor-default'
                                : 'bg-gray-100 text-gray-600 hover:bg-emerald-100 hover:text-emerald-700'
                            }`}
                            disabled={saved}
                          >
                            {saved ? '✓ 저장됨' : '+ 저장'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
