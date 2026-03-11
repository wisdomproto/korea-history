import { useState } from 'react';
import { useExams } from '@/features/exam/hooks/useExams';
import { ERAS, CATEGORIES } from '@/lib/types';
import type { ExamFile } from '@/lib/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { examApi } from '@/features/exam/api/exam.api';
import { keywordApi, type KeywordStats } from '@/features/keyword/api/keyword.api';

function useAllQuestions() {
  const { data: exams } = useExams();
  return useQuery({
    queryKey: ['all-questions'],
    queryFn: async () => {
      if (!exams) return [];
      const files = await Promise.all(exams.map((e) => examApi.getById(e.id)));
      return files.flatMap((f: ExamFile) => f.questions);
    },
    enabled: !!exams?.length,
  });
}

function useKeywordStats() {
  return useQuery({
    queryKey: ['keyword-stats'],
    queryFn: () => keywordApi.getStats(),
    staleTime: 60_000,
  });
}

const ERA_COLORS: Record<string, string> = {
  '선사·고조선': '#D97706',
  '삼국': '#DC2626',
  '남북국': '#EA580C',
  '고려': '#059669',
  '조선 전기': '#2563EB',
  '조선 후기': '#4F46E5',
  '근대': '#9333EA',
  '현대': '#EC4899',
};

const CATEGORY_COLORS: Record<string, string> = {
  '정치': '#6366F1',
  '경제': '#F59E0B',
  '사회': '#10B981',
  '문화': '#8B5CF6',
};

export function StatsPanel() {
  const { data: exams } = useExams();
  const { data: questions } = useAllQuestions();
  const { data: kwStats, isLoading: kwLoading } = useKeywordStats();
  const qc = useQueryClient();

  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState('');
  const [kwTab, setKwTab] = useState<'era' | 'category' | 'top'>('top');

  if (!exams || !questions) return null;

  const byEra = ERAS.map((era) => ({ era, count: questions.filter((q) => q.era === era).length }));
  const byCategory = CATEGORIES.map((cat) => ({ category: cat, count: questions.filter((q) => q.category === cat).length }));
  const byDifficulty = [1, 2, 3].map((d) => ({ difficulty: d, count: questions.filter((q) => q.difficulty === d).length }));
  const maxEra = Math.max(...byEra.map((e) => e.count), 1);

  const handleExtract = () => {
    setExtracting(true);
    setProgress('시작 중...');
    keywordApi.extract(
      (msg) => setProgress(msg),
      () => {
        setExtracting(false);
        setProgress('');
        qc.invalidateQueries({ queryKey: ['keyword-stats'] });
      },
      (err) => {
        setExtracting(false);
        setProgress(`오류: ${err}`);
      },
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard label="총 시험" value={exams.length} color="bg-blue-50 text-blue-700" />
        <SummaryCard label="총 문제" value={questions.length} color="bg-green-50 text-green-700" />
        <SummaryCard label="무료 시험" value={exams.filter((e) => e.isFree).length} color="bg-amber-50 text-amber-700" />
        <SummaryCard label="키워드" value={kwStats?.totalKeywords ?? 0} color="bg-pink-50 text-pink-700" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Era Distribution */}
        <div className="rounded-xl border bg-white p-5">
          <h3 className="mb-4 font-semibold">시대별 분포</h3>
          <div className="space-y-2">
            {byEra.map(({ era, count }) => (
              <div key={era} className="flex items-center gap-3">
                <span className="w-20 text-xs text-gray-600 truncate">{era}</span>
                <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all"
                    style={{ width: `${(count / maxEra) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-sm font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category & Difficulty */}
        <div className="space-y-6">
          <div className="rounded-xl border bg-white p-5">
            <h3 className="mb-3 font-semibold">분야별</h3>
            <div className="grid grid-cols-2 gap-2">
              {byCategory.map(({ category, count }) => (
                <div key={category} className="rounded-lg bg-gray-50 px-3 py-2 text-center">
                  <div className="text-lg font-bold text-gray-800">{count}</div>
                  <div className="text-xs text-gray-500">{category}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border bg-white p-5">
            <h3 className="mb-3 font-semibold">난이도별</h3>
            <div className="grid grid-cols-3 gap-2">
              {byDifficulty.map(({ difficulty, count }) => (
                <div key={difficulty} className="rounded-lg bg-gray-50 px-3 py-2 text-center">
                  <div className="text-lg font-bold text-gray-800">{count}</div>
                  <div className="text-xs text-gray-500">{['기초', '중급', '심화'][difficulty - 1]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Keyword Section */}
      <div className="rounded-xl border bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold">키워드 분석</h3>
            {kwStats && (
              <p className="mt-1 text-xs text-gray-500">
                {kwStats.totalKeywords}개 키워드 · {kwStats.totalMappings}개 매핑
              </p>
            )}
          </div>
          <button
            onClick={handleExtract}
            disabled={extracting}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              extracting
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            {extracting ? '추출 중...' : kwStats ? '키워드 재추출' : '키워드 추출'}
          </button>
        </div>

        {/* Progress */}
        {extracting && (
          <div className="mb-4 rounded-lg bg-blue-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
              <span className="text-sm text-blue-700">{progress}</span>
            </div>
          </div>
        )}

        {/* Keyword Tabs & Content */}
        {kwStats ? (
          <>
            <div className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1">
              {([
                { key: 'top', label: '빈출 키워드' },
                { key: 'era', label: '시대별' },
                { key: 'category', label: '분야별' },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setKwTab(tab.key)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    kwTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {kwTab === 'top' && <TopKeywordsTable stats={kwStats} />}
            {kwTab === 'era' && <ByEraTable stats={kwStats} />}
            {kwTab === 'category' && <ByCategoryTable stats={kwStats} />}
          </>
        ) : !kwLoading ? (
          <div className="py-8 text-center text-sm text-gray-400">
            키워드가 아직 추출되지 않았습니다. 위 버튼을 눌러 추출하세요.
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Top keywords table */
function TopKeywordsTable({ stats }: { stats: KeywordStats }) {
  const [showAll, setShowAll] = useState(false);
  const items = showAll ? stats.topKeywords : stats.topKeywords.slice(0, 20);
  const maxCount = stats.topKeywords[0]?.count ?? 1;

  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-gray-500">
            <th className="pb-2 font-medium">#</th>
            <th className="pb-2 font-medium">키워드</th>
            <th className="pb-2 font-medium">시대</th>
            <th className="pb-2 font-medium">분야</th>
            <th className="pb-2 font-medium text-right">문항수</th>
            <th className="pb-2 font-medium w-32"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.keyword} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="py-2 text-gray-400">{i + 1}</td>
              <td className="py-2 font-medium text-gray-800">{item.keyword}</td>
              <td className="py-2">
                <span
                  className="inline-block rounded px-1.5 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: ERA_COLORS[item.era] ?? '#888' }}
                >
                  {item.era}
                </span>
              </td>
              <td className="py-2">
                <span
                  className="inline-block rounded px-1.5 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: CATEGORY_COLORS[item.category] ?? '#888' }}
                >
                  {item.category}
                </span>
              </td>
              <td className="py-2 text-right font-medium">{item.count}</td>
              <td className="py-2 pl-3">
                <div className="h-2 rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-primary-400"
                    style={{ width: `${(item.count / maxCount) * 100}%` }}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {stats.topKeywords.length > 20 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 text-sm text-primary-600 hover:text-primary-800"
        >
          {showAll ? '접기' : `전체 ${stats.topKeywords.length}개 보기`}
        </button>
      )}
    </div>
  );
}

/** Keywords grouped by era */
function ByEraTable({ stats }: { stats: KeywordStats }) {
  const eras = ERAS.filter((e) => stats.byEra[e]);

  return (
    <div className="space-y-4 max-h-[500px] overflow-y-auto">
      {eras.map((era) => {
        const data = stats.byEra[era];
        if (!data) return null;
        return (
          <div key={era} className="rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: ERA_COLORS[era] ?? '#888' }}
                />
                <span className="font-medium text-gray-800">{era}</span>
              </div>
              <span className="text-xs text-gray-500">{data.count}개 키워드</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {data.keywords.slice(0, 30).map((kw) => (
                <span
                  key={kw}
                  className="inline-block rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700"
                >
                  {kw}
                </span>
              ))}
              {data.keywords.length > 30 && (
                <span className="inline-block rounded-full bg-gray-50 px-2.5 py-1 text-xs text-gray-400">
                  +{data.keywords.length - 30}개
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Keywords grouped by category */
function ByCategoryTable({ stats }: { stats: KeywordStats }) {
  const cats = CATEGORIES.filter((c) => stats.byCategory[c]);

  return (
    <div className="grid grid-cols-2 gap-4">
      {cats.map((cat) => {
        const data = stats.byCategory[cat];
        if (!data) return null;
        return (
          <div key={cat} className="rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[cat] ?? '#888' }}
                />
                <span className="font-medium text-gray-800">{cat}</span>
              </div>
              <span className="text-xs text-gray-500">{data.count}개</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
              {data.keywords.slice(0, 25).map((kw) => (
                <span
                  key={kw}
                  className="inline-block rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700"
                >
                  {kw}
                </span>
              ))}
              {data.keywords.length > 25 && (
                <span className="inline-block rounded-full bg-gray-50 px-2.5 py-1 text-xs text-gray-400">
                  +{data.keywords.length - 25}개
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl p-4 ${color}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm opacity-75">{label}</div>
    </div>
  );
}
