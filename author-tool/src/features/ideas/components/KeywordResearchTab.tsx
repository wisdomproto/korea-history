import { useEffect, useMemo, useState } from 'react';
import { useEditorStore } from '@/store/editor.store';
import { useProjectSettings, useUpdateProjectSettings } from '@/features/settings/hooks/useSettings';
import {
  useResearchKeywords,
  useResearchGoogleKeywords,
  useGscOpportunities,
  useAnalyzeGolden,
} from '../hooks/useIdeas';
import type {
  CompetitionLevel,
  GscOpportunity,
  GoldenKeywordInsight,
  SavedKeyword,
} from '../types';

type Source = 'naver' | 'google' | 'gsc';
type Filter = 'all' | 'golden' | 'high';

const COMP_BADGE: Record<CompetitionLevel, string> = {
  high: 'bg-rose-100 text-rose-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-emerald-100 text-emerald-700',
  unknown: 'bg-gray-100 text-gray-600',
};

const COMP_LABEL: Record<CompetitionLevel, string> = {
  high: '높음',
  medium: '중간',
  low: '낮음',
  unknown: '?',
};

const INSIGHT_BORDER: Record<'teal' | 'amber' | 'coral' | 'purple', string> = {
  teal: 'border-t-emerald-500',
  amber: 'border-t-amber-500',
  coral: 'border-t-rose-500',
  purple: 'border-t-purple-500',
};

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

interface UnifiedRow {
  keyword: string;
  totalVolume: number;
  pcVolume?: number;
  mobileVolume?: number;
  competition: string;
  competitionLevel: CompetitionLevel;
  cpc?: number;
  isGolden: boolean;
}

export function KeywordResearchTab() {
  const projectId = useEditorStore((s) => s.selectedProjectId);
  const { data: settings } = useProjectSettings(projectId);
  const savedKeywords = settings?.savedKeywords ?? [];
  const updateSettings = useUpdateProjectSettings(projectId);

  const naverMut = useResearchKeywords();
  const googleMut = useResearchGoogleKeywords();
  const gscMut = useGscOpportunities();
  const goldenMut = useAnalyzeGolden();

  const [seed, setSeed] = useState('');
  const [source, setSource] = useState<Source>('google');
  const [gscDays, setGscDays] = useState(30);
  const [filter, setFilter] = useState<Filter>('all');

  const buildContext = () =>
    [settings?.brand?.description, settings?.brand?.usp].filter(Boolean).join('\n') || undefined;

  const doNaver = () => {
    if (!seed.trim()) return;
    naverMut.mutate({ seed: seed.trim(), context: buildContext(), limit: 15 });
    goldenMut.reset();
  };

  const doGoogle = () => {
    if (!seed.trim()) return;
    googleMut.mutate({ seed: seed.trim(), context: buildContext(), limit: 15 });
    goldenMut.reset();
  };

  const doGsc = () => {
    gscMut.mutate({ start: isoDaysAgo(gscDays), end: isoDaysAgo(3), minImpressions: 5, maxPosition: 50 });
  };

  // Unify Naver / Google rows into one shape so the table works for both
  const rows: UnifiedRow[] = useMemo(() => {
    if (source === 'naver') {
      return (naverMut.data?.keywords ?? []).map((r) => ({
        keyword: r.keyword,
        totalVolume: r.totalSearchVolume,
        pcVolume: r.pcSearchVolume,
        mobileVolume: r.mobileSearchVolume,
        competition: r.competition,
        competitionLevel: r.competitionLevel,
        isGolden: r.isGolden,
      }));
    }
    if (source === 'google') {
      return (googleMut.data?.keywords ?? []).map((r) => ({
        keyword: r.keyword,
        totalVolume: r.searchVolume,
        competition: r.competition,
        competitionLevel: r.competitionLevel,
        cpc: r.cpc,
        isGolden: r.isGolden,
      }));
    }
    return [];
  }, [source, naverMut.data, googleMut.data]);

  const filteredRows = useMemo(() => {
    let out = rows;
    if (filter === 'golden') out = out.filter((r) => r.isGolden);
    else if (filter === 'high') out = out.filter((r) => r.totalVolume >= 2000);
    return [...out].sort((a, b) => b.totalVolume - a.totalVolume);
  }, [rows, filter]);

  const summary = useMemo(() => {
    const goldenCount = rows.filter((r) => r.isGolden).length;
    const highCount = rows.filter((r) => r.totalVolume >= 2000).length;
    const mobileAvg =
      source === 'naver' && rows.length
        ? Math.round(
            rows.reduce((s, r) => {
              const m = r.mobileVolume ?? 0;
              const t = r.totalVolume || 1;
              return s + (m / t) * 100;
            }, 0) / rows.length
          )
        : null;
    return { total: rows.length, goldenCount, highCount, mobileAvg };
  }, [rows, source]);

  const goldenAnalysis = goldenMut.data;

  const runAiGoldenAnalysis = () => {
    if (rows.length === 0) return;
    goldenMut.mutate({
      source: source === 'gsc' ? 'naver' : source,
      projectId: projectId ?? undefined,
      keywords: rows.map((r) => ({
        keyword: r.keyword,
        totalVolume: r.totalVolume,
        competition: r.competition,
      })),
    });
  };

  // Auto-trigger AI golden analysis as soon as Google research completes
  // (skipped for Naver — those keywords are mostly '높음' so AI value is lower,
  //  user can opt-in via the manual button)
  useEffect(() => {
    if (source === 'google' && googleMut.isSuccess && googleMut.data && !goldenMut.isPending && !goldenMut.data) {
      goldenMut.mutate({
        source: 'google',
        projectId: projectId ?? undefined,
        keywords: (googleMut.data.keywords ?? []).map((r) => ({
          keyword: r.keyword,
          totalVolume: r.searchVolume,
          competition: r.competition,
        })),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleMut.isSuccess, googleMut.data, source]);

  const saveTerm = (term: string, extra: Partial<SavedKeyword>) => {
    const existing = savedKeywords.find((k) => k.term.toLowerCase() === term.toLowerCase());
    if (existing) {
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

  const isLoading =
    (source === 'naver' && naverMut.isPending) ||
    (source === 'google' && googleMut.isPending) ||
    (source === 'gsc' && gscMut.isPending);

  const isMonthlyView = source === 'naver' || source === 'google';

  const gscRows: GscOpportunity[] = gscMut.data?.queries ?? [];

  return (
    <div className="space-y-6">
      {/* Source toggle — Google is primary; Naver/GSC secondary */}
      <div className="inline-flex rounded-full bg-gray-100 p-1">
        {(['google', 'naver', 'gsc'] as const).map((s) => (
          <button
            key={s}
            onClick={() => {
              setSource(s);
              setFilter('all');
              goldenMut.reset();
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              source === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {s === 'google' && '🔵 Google ⭐ 추천'}
            {s === 'naver' && '🟢 Naver (참고)'}
            {s === 'gsc' && '🔍 GSC 실측'}
          </button>
        ))}
      </div>
      {source === 'google' && (
        <p className="text-[11px] text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          💡 Google(DataForSEO) 기반은 한국 시장의 실제 SEO 난이도를 더 잘 반영합니다. 리서치 완료 즉시 AI가 황금 키워드 + 시장 진단을 자동 분석합니다.
        </p>
      )}
      {source === 'naver' && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          ⚠️ Naver compIdx는 파워링크(유료광고) 경쟁 기준입니다. 광고가 포화된 시장(예: 한능검/공무원)에선 거의 모든 키워드가 "높음"으로 표기되어 블로그 SEO 난이도와 상관관계가 약합니다.
        </p>
      )}

      {/* Naver / Google: shared search input */}
      {isMonthlyView && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (source === 'naver' ? doNaver() : doGoogle())}
              placeholder={source === 'naver' ? '시드 키워드 (예: 한능검 공부법)' : '시드 키워드 (Google)'}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
            <button
              onClick={source === 'naver' ? doNaver : doGoogle}
              disabled={!seed.trim() || isLoading}
              className={`rounded-lg px-4 py-2 text-xs font-bold text-white disabled:bg-gray-300 disabled:cursor-not-allowed ${
                source === 'naver' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isLoading ? '리서치 중...' : 'AI + 리서치'}
            </button>
          </div>
          <p className="text-[11px] text-gray-500">
            {source === 'naver'
              ? 'Gemini가 연관 키워드를 제안한 뒤, Naver 검색광고 API에서 월간 검색량·경쟁률을 가져옵니다.'
              : 'Gemini가 연관 키워드를 제안한 뒤, DataForSEO를 통해 Google Ads 검색량·경쟁률·CPC를 가져옵니다.'}
          </p>

          {(naverMut.isError || googleMut.isError) && (
            <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              실패: {(((source === 'naver' ? naverMut.error : googleMut.error) as Error)?.message) ?? 'unknown'}
            </div>
          )}

          {/* Summary cards */}
          {rows.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SummaryCard label="분석 키워드" value={summary.total} />
              <SummaryCard label="고볼륨 (2000+)" value={summary.highCount} valueClass="text-rose-600" />
              <SummaryCard label="🥇 황금 키워드" value={summary.goldenCount} valueClass="text-emerald-600" />
              <SummaryCard
                label={source === 'google' ? '평균 CPC' : '평균 모바일%'}
                value={
                  source === 'google'
                    ? `₩${Math.round(rows.reduce((s, r) => s + (r.cpc ?? 0), 0) / Math.max(rows.length, 1) * 1000)}`
                    : `${summary.mobileAvg ?? 0}%`
                }
              />
            </div>
          )}

          {/* Filter chips + AI golden button */}
          {rows.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {([
                { id: 'all', label: '전체' },
                { id: 'golden', label: '🥇 황금' },
                { id: 'high', label: '🔴 2000+' },
              ] as const).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    filter === f.id
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400'
                  }`}
                >
                  {f.label}
                </button>
              ))}
              <span className="text-[11px] text-gray-500 ml-1">{filteredRows.length}개 표시</span>

              <button
                onClick={runAiGoldenAnalysis}
                disabled={goldenMut.isPending}
                className="ml-auto rounded-lg bg-amber-500 px-3 py-1 text-xs font-bold text-white hover:bg-amber-600 disabled:bg-gray-300"
                title="Gemini로 황금 키워드 분석 + 전략 코멘트"
              >
                {goldenMut.isPending ? '🤖 AI 분석 중...' : goldenAnalysis ? '🔁 AI 재분석' : '🤖 AI 황금 분석'}
              </button>
            </div>
          )}

          {/* AI Golden loading state (visible during auto-trigger) */}
          {goldenMut.isPending && rows.length > 0 && (
            <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 px-4 py-6 flex items-center gap-3">
              <div className="text-2xl animate-pulse">🤖</div>
              <div>
                <div className="text-sm font-bold text-amber-900">AI 황금 키워드 분석 중...</div>
                <div className="text-xs text-amber-700">Gemini가 {rows.length}개 키워드를 분석해 블로그 진입 가능한 황금 키워드와 시장 진단을 뽑고 있습니다 (10~30초)</div>
              </div>
            </div>
          )}

          {/* AI Golden cards */}
          {goldenAnalysis && goldenAnalysis.goldenKeywords.length > 0 && (
            <GoldenSection
              goldenKeywords={goldenAnalysis.goldenKeywords}
              onSave={(g) =>
                saveTerm(g.keyword, {
                  source: source === 'naver' ? 'naver' : 'manual',
                  volume: g.totalSearch,
                  competition: g.competition,
                  memo: g.strategy,
                })
              }
              isSaved={isSaved}
            />
          )}

          {goldenAnalysis && goldenAnalysis.insights.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {goldenAnalysis.insights.map((ins, i) => (
                <div
                  key={i}
                  className={`bg-white border rounded-xl p-4 border-t-[3px] ${INSIGHT_BORDER[ins.color] ?? 'border-t-gray-300'}`}
                >
                  <div className="font-bold text-sm mb-1">{ins.title}</div>
                  <div className="text-xs text-gray-500">{ins.description}</div>
                </div>
              ))}
            </div>
          )}

          {goldenMut.isError && (
            <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              AI 분석 실패: {(goldenMut.error as Error).message}
            </div>
          )}

          {/* Keyword table */}
          {filteredRows.length > 0 && (
            <KeywordTable
              rows={filteredRows}
              source={source as 'naver' | 'google'}
              isSaved={isSaved}
              onSave={(r) =>
                saveTerm(r.keyword, {
                  source: source === 'naver' ? 'naver' : 'manual',
                  volume: r.totalVolume,
                  pcVolume: r.pcVolume,
                  mobileVolume: r.mobileVolume,
                  competition: r.competition,
                })
              }
            />
          )}
        </section>
      )}

      {/* GSC unchanged */}
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
                        <td className="px-3 py-2 text-right tabular-nums text-blue-600">{r.clicks.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-purple-600">{r.impressions.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-emerald-600">{r.ctr}%</td>
                        <td className="px-3 py-2 text-right tabular-nums text-amber-600">#{r.position}</td>
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

// ---- subcomponents ----

function SummaryCard({ label, value, valueClass }: { label: string; value: number | string; valueClass?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3">
      <div className={`text-2xl font-black ${valueClass ?? ''}`}>{typeof value === 'number' ? value.toLocaleString() : value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function GoldenSection({
  goldenKeywords,
  onSave,
  isSaved,
}: {
  goldenKeywords: GoldenKeywordInsight[];
  onSave: (g: GoldenKeywordInsight) => void;
  isSaved: (term: string) => boolean;
}) {
  return (
    <div>
      <h3 className="text-sm font-bold mb-3 flex items-center gap-1">
        🥇 황금 키워드 — 지금 공략 가능
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {goldenKeywords.map((g, i) => {
          const saved = isSaved(g.keyword);
          return (
            <div
              key={i}
              className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col gap-1"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-emerald-700">
                  #{g.priority} · 월 {g.totalSearch.toLocaleString()} · 경쟁 {g.competition}
                </div>
                <button
                  onClick={() => onSave(g)}
                  disabled={saved}
                  className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                    saved
                      ? 'bg-emerald-200 text-emerald-800 cursor-default'
                      : 'bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                  }`}
                >
                  {saved ? '✓ 저장됨' : '+ 저장'}
                </button>
              </div>
              <div className="font-bold text-gray-900">{g.keyword}</div>
              <div className="text-xs text-gray-700 leading-relaxed">{g.strategy}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KeywordTable({
  rows,
  source,
  isSaved,
  onSave,
}: {
  rows: UnifiedRow[];
  source: 'naver' | 'google';
  isSaved: (term: string) => boolean;
  onSave: (r: UnifiedRow) => void;
}) {
  const maxVol = Math.max(...rows.map((r) => r.totalVolume), 1);

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-xs">
        <thead className="bg-gray-50 text-[10px] uppercase text-gray-500">
          <tr>
            <th className="text-left px-3 py-2">키워드</th>
            <th className="text-right px-3 py-2">월간 검색량</th>
            <th className="text-center px-3 py-2">경쟁</th>
            {source === 'naver' && <th className="text-right px-3 py-2">PC</th>}
            {source === 'naver' && <th className="text-right px-3 py-2">Mobile</th>}
            {source === 'google' && <th className="text-right px-3 py-2">CPC</th>}
            <th className="text-center px-3 py-2 w-20">저장</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const saved = isSaved(r.keyword);
            const barW = Math.max(4, Math.round((r.totalVolume / maxVol) * 70));
            return (
              <tr key={r.keyword} className={`border-t border-gray-100 hover:bg-gray-50 ${r.isGolden ? 'bg-emerald-50/40' : ''}`}>
                <td className="px-3 py-2 font-medium text-gray-800">
                  {r.keyword}
                  {r.isGolden && <span className="ml-1" title="황금 키워드">🥇</span>}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-bold">
                  <span className="inline-block h-1.5 rounded-full bg-emerald-500 align-middle mr-1.5" style={{ width: `${barW}px` }} />
                  {r.totalVolume.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${COMP_BADGE[r.competitionLevel]}`}>
                    {COMP_LABEL[r.competitionLevel]}
                  </span>
                </td>
                {source === 'naver' && (
                  <td className="px-3 py-2 text-right tabular-nums text-gray-500">{(r.pcVolume ?? 0).toLocaleString()}</td>
                )}
                {source === 'naver' && (
                  <td className="px-3 py-2 text-right tabular-nums text-gray-500">{(r.mobileVolume ?? 0).toLocaleString()}</td>
                )}
                {source === 'google' && (
                  <td className="px-3 py-2 text-right tabular-nums text-gray-500">${(r.cpc ?? 0).toFixed(2)}</td>
                )}
                <td className="px-3 py-2 text-center">
                  <button
                    onClick={() => onSave(r)}
                    disabled={saved}
                    className={`rounded px-2 py-0.5 text-[10px] font-bold transition-colors ${
                      saved
                        ? 'bg-emerald-100 text-emerald-700 cursor-default'
                        : 'bg-gray-100 text-gray-600 hover:bg-emerald-100 hover:text-emerald-700'
                    }`}
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
  );
}
