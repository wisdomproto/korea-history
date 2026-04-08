import { useState } from 'react';
import { apiPost } from '../../../../lib/axios';

// ─── Local types ───

interface KeywordData {
  keyword: string;
  totalSearchVolume: number;
  competition: string;
  pcSearchVolume: number;
  mobileSearchVolume: number;
}

type KeywordSortKey = 'keyword' | 'totalSearchVolume' | 'competition';

// ─── Props ───

interface KeywordPanelProps {
  topic: string;
  baseArticleHtml: string | undefined;
  selectedKeywords: Set<string>;
  setSelectedKeywords: React.Dispatch<React.SetStateAction<Set<string>>>;
  isGenerating: boolean;
  hasCurrent: boolean;
  onGenerate: () => void;
}

export function KeywordPanel({
  topic,
  baseArticleHtml,
  selectedKeywords,
  setSelectedKeywords,
  isGenerating,
  hasCurrent,
  onGenerate,
}: KeywordPanelProps) {
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([]);
  const [keywordDataMap, setKeywordDataMap] = useState<Map<string, KeywordData>>(new Map());
  const [isLoadingKeywords, setIsLoadingKeywords] = useState(false);
  const [isLoadingKeywordData, setIsLoadingKeywordData] = useState(false);
  const [keywordSort, setKeywordSort] = useState<{ key: KeywordSortKey; asc: boolean }>({ key: 'totalSearchVolume', asc: false });
  const [showKeywordTable, setShowKeywordTable] = useState(true);

  const handleSuggestKeywords = async () => {
    setIsLoadingKeywords(true);
    try {
      const suggested = await apiPost<string[]>('/blog-tools/suggest-keywords', {
        topic,
        baseArticle: baseArticleHtml,
      });
      setSuggestedKeywords(suggested);
      setSelectedKeywords(new Set(suggested));
    } catch (err: unknown) {
      alert(`키워드 추천 실패: ${err instanceof Error ? err.message : err}`);
    } finally {
      setIsLoadingKeywords(false);
    }
  };

  const handleFetchKeywordData = async () => {
    const keywords = Array.from(selectedKeywords);
    if (keywords.length === 0) { alert('키워드를 먼저 선택하세요.'); return; }
    setIsLoadingKeywordData(true);
    try {
      const data = await apiPost<KeywordData[]>('/blog-tools/keyword-data', { keywords });
      if (!data || data.length === 0) {
        alert('네이버 API에서 검색량 데이터를 받지 못했습니다. API 키를 확인하세요.');
      } else {
        const map = new Map(keywordDataMap);
        data.forEach((d) => map.set(d.keyword, d));
        setKeywordDataMap(map);
        setSelectedKeywords(new Set(data.map((d) => d.keyword)));
      }
    } catch (err: unknown) {
      alert(`검색량 조회 실패: ${err instanceof Error ? err.message : err}`);
    } finally {
      setIsLoadingKeywordData(false);
    }
  };

  const toggleKeyword = (kw: string) => {
    setSelectedKeywords((prev) => {
      const next = new Set(prev);
      if (next.has(kw)) next.delete(kw);
      else next.add(kw);
      return next;
    });
  };

  const getSortedKeywordsWithData = (): KeywordData[] => {
    const entries = Array.from(keywordDataMap.values());
    entries.sort((a, b) => {
      const { key, asc } = keywordSort;
      if (key === 'keyword') return asc ? a.keyword.localeCompare(b.keyword) : b.keyword.localeCompare(a.keyword);
      if (key === 'competition') return asc ? a.competition.localeCompare(b.competition) : b.competition.localeCompare(a.competition);
      return asc ? a.totalSearchVolume - b.totalSearchVolume : b.totalSearchVolume - a.totalSearchVolume;
    });
    return entries;
  };

  const handleSortToggle = (key: KeywordSortKey) => {
    setKeywordSort((prev) => prev.key === key ? { key, asc: !prev.asc } : { key, asc: false });
  };

  return (
    <div className="px-5 py-3 border-b border-gray-200">
      <div className="bg-blue-50 rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-blue-800">🔍 키워드 연구</h3>
          <button
            className="px-3 py-1.5 bg-blue-500 text-white rounded-md text-xs font-medium hover:bg-blue-600 disabled:opacity-50"
            onClick={handleSuggestKeywords}
            disabled={isLoadingKeywords}
          >
            {isLoadingKeywords ? <span className="flex items-center gap-1"><Spinner /> 분석 중...</span> : '키워드 추천'}
          </button>
          {suggestedKeywords.length > 0 && selectedKeywords.size > 0 && (
            <button
              className="px-3 py-1.5 bg-white text-blue-600 border border-blue-300 rounded-md text-xs font-medium hover:bg-blue-100 disabled:opacity-50"
              onClick={handleFetchKeywordData}
              disabled={isLoadingKeywordData}
            >
              {isLoadingKeywordData ? <span className="flex items-center gap-1"><Spinner /> 조회 중...</span> : '📊 검색량 조회'}
            </button>
          )}
          <span className="text-[10px] text-blue-500 ml-auto">{selectedKeywords.size}개 선택</span>
        </div>

        {/* Suggested keywords as chips */}
        {suggestedKeywords.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestedKeywords.map((kw) => (
              <label
                key={kw}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs cursor-pointer transition-colors ${
                  selectedKeywords.has(kw)
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-100'
                }`}
              >
                <input type="checkbox" checked={selectedKeywords.has(kw)} onChange={() => toggleKeyword(kw)} className="sr-only" />
                {kw}
              </label>
            ))}
            {/* Add keyword inline input */}
            <form
              className="inline-flex"
              onSubmit={(e) => {
                e.preventDefault();
                const input = (e.target as HTMLFormElement).elements.namedItem('newkw') as HTMLInputElement;
                const val = input.value.trim();
                if (val) {
                  setSuggestedKeywords((prev) => prev.includes(val) ? prev : [...prev, val]);
                  setSelectedKeywords((prev) => new Set([...prev, val]));
                  input.value = '';
                }
              }}
            >
              <input
                name="newkw"
                placeholder="+ 키워드 추가"
                className="px-3 py-1.5 rounded-full text-xs border border-dashed border-blue-300 bg-white text-blue-600 placeholder-blue-400 w-28 focus:outline-none focus:border-blue-500"
              />
            </form>
          </div>
        )}

        {/* Keyword data table */}
        {keywordDataMap.size > 0 && (
          <div className="bg-white rounded-lg border border-blue-100 overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
              onClick={() => setShowKeywordTable(!showKeywordTable)}
            >
              <span>📊 검색량 데이터 ({keywordDataMap.size}개)</span>
              <span>{showKeywordTable ? '▾' : '▸'}</span>
            </button>
            {showKeywordTable && <table className="w-full text-xs">
              <thead>
                <tr className="bg-blue-50 text-blue-700">
                  <th className="px-3 py-2 text-left w-8">
                    <input
                      type="checkbox"
                      checked={Array.from(keywordDataMap.keys()).every((kw) => selectedKeywords.has(kw))}
                      onChange={(e) => {
                        const dataKeywords = Array.from(keywordDataMap.keys());
                        if (e.target.checked) {
                          setSelectedKeywords((prev) => { const next = new Set(prev); dataKeywords.forEach((kw) => next.add(kw)); return next; });
                        } else {
                          setSelectedKeywords((prev) => { const next = new Set(prev); dataKeywords.forEach((kw) => next.delete(kw)); return next; });
                        }
                      }}
                    />
                  </th>
                  <th className="px-3 py-2 text-left cursor-pointer hover:text-blue-900" onClick={() => handleSortToggle('keyword')}>
                    키워드 {keywordSort.key === 'keyword' ? (keywordSort.asc ? '▲' : '▼') : ''}
                  </th>
                  <th className="px-3 py-2 text-right cursor-pointer hover:text-blue-900" onClick={() => handleSortToggle('totalSearchVolume')}>
                    검색량 {keywordSort.key === 'totalSearchVolume' ? (keywordSort.asc ? '▲' : '▼') : ''}
                  </th>
                  <th className="px-3 py-2 text-right">PC</th>
                  <th className="px-3 py-2 text-right">모바일</th>
                  <th className="px-3 py-2 text-center cursor-pointer hover:text-blue-900" onClick={() => handleSortToggle('competition')}>
                    경쟁률 {keywordSort.key === 'competition' ? (keywordSort.asc ? '▲' : '▼') : ''}
                  </th>
                </tr>
              </thead>
              <tbody>
                {getSortedKeywordsWithData().map((d) => (
                  <tr key={d.keyword} className="border-t border-blue-50 hover:bg-blue-50/50">
                    <td className="px-3 py-1.5">
                      <input type="checkbox" checked={selectedKeywords.has(d.keyword)} onChange={() => toggleKeyword(d.keyword)} />
                    </td>
                    <td className="px-3 py-1.5 font-medium">{d.keyword}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{d.totalSearchVolume.toLocaleString()}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-gray-500">{d.pcSearchVolume.toLocaleString()}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-gray-500">{d.mobileSearchVolume.toLocaleString()}</td>
                    <td className="px-3 py-1.5 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        d.competition === '높음' ? 'bg-red-100 text-red-600' :
                        d.competition === '중간' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-green-100 text-green-600'
                      }`}>
                        {d.competition}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 mt-3">
        <button
          className="px-4 py-1.5 bg-blue-500 text-white rounded-md text-xs font-medium hover:bg-blue-600 disabled:opacity-50"
          onClick={onGenerate}
          disabled={isGenerating || selectedKeywords.size === 0}
        >
          {isGenerating ? '⏳ 생성 중...' : `✨ 선택 키워드로 블로그 ${hasCurrent ? '재생성' : '생성'}`}
        </button>
        <span className="text-[10px] text-gray-400">선택한 키워드 기반으로 SEO 최적화된 블로그를 생성합니다</span>
      </div>
    </div>
  );
}

// ─── Tiny spinner component ───

function Spinner() {
  return (
    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
