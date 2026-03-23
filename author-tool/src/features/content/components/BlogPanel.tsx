// author-tool/src/features/content/components/BlogPanel.tsx
import { useState, useRef } from 'react';
import type { ContentFile, BlogContent, BlogCard } from '../../../lib/content-types';
import { apiPost } from '../../../lib/axios';
import { useGenerateImage } from '../hooks/useContent';
import { copyToClipboard } from '../api/content.api';
import { useDebouncedSave } from '../hooks/useDebouncedSave';
import { useChannelGeneration } from '../hooks/useChannelGeneration';
import { ChannelModelSelector } from './ChannelModelSelector';

// ─── Local types ───

interface KeywordData {
  keyword: string;
  totalSearchVolume: number;
  competition: string;
  pcSearchVolume: number;
  mobileSearchVolume: number;
}

interface SeoDetail {
  category: string;
  label: string;
  score: number;
  maxScore: number;
  message: string;
}

interface SeoResult {
  score: number;
  details: SeoDetail[];
}

type KeywordSortKey = 'keyword' | 'totalSearchVolume' | 'competition';

// ─── Component ───

interface Props {
  contentFile: ContentFile;
}

export function BlogPanel({ contentFile }: Props) {
  const { content, baseArticle, blog } = contentFile;
  const current = blog[0] as BlogContent | undefined;
  const [modelId, setModelId] = useState('gemini-2.5-flash');
  const [imageModelId, setImageModelId] = useState('gemini-2.5-flash-image');
  const [showPreview, setShowPreview] = useState(false);

  // Keyword research state
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());
  const [keywordDataMap, setKeywordDataMap] = useState<Map<string, KeywordData>>(new Map());
  const [isLoadingKeywords, setIsLoadingKeywords] = useState(false);
  const [isLoadingKeywordData, setIsLoadingKeywordData] = useState(false);
  const [keywordSort, setKeywordSort] = useState<{ key: KeywordSortKey; asc: boolean }>({ key: 'totalSearchVolume', asc: false });

  // SEO analysis state
  const [seoResult, setSeoResult] = useState<SeoResult | null>(null);
  const [isLoadingSeo, setIsLoadingSeo] = useState(false);
  const [showSeoPanel, setShowSeoPanel] = useState(false);

  const { save, saveNow } = useDebouncedSave(content.id, 'blog');
  const genImage = useGenerateImage();
  const dragRef = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const { isGenerating, generate } = useChannelGeneration({
    contentId: content.id,
    path: 'generate/blog',
  });

  // ─── Keyword Research ───

  const handleSuggestKeywords = async () => {
    setIsLoadingKeywords(true);
    try {
      const suggested = await apiPost<string[]>('/blog-tools/suggest-keywords', {
        topic: content.title,
        baseArticle: baseArticle?.html,
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
    if (keywords.length === 0) return;
    setIsLoadingKeywordData(true);
    try {
      const data = await apiPost<KeywordData[]>('/blog-tools/keyword-data', { keywords });
      const map = new Map(keywordDataMap);
      data.forEach((d) => map.set(d.keyword, d));
      setKeywordDataMap(map);
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
    const entries = suggestedKeywords
      .filter((kw) => keywordDataMap.has(kw))
      .map((kw) => keywordDataMap.get(kw)!);
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

  // ─── Generation ───

  const handleGenerate = () => {
    const keywords = Array.from(selectedKeywords);
    generate({ modelId, keywords });
  };

  // ─── SEO Analysis ───

  const handleSeoAnalysis = async () => {
    if (!current) return;
    setIsLoadingSeo(true);
    setShowSeoPanel(true);
    try {
      const primaryKeyword = current.seoKeywords[0] || '';
      const secondaryKeywords = current.seoKeywords.slice(1);
      const result = await apiPost<SeoResult>('/blog-tools/seo-score', {
        title: current.title,
        cards: current.cards,
        primaryKeyword,
        secondaryKeywords,
      });
      setSeoResult(result);
    } catch (err: unknown) {
      alert(`SEO 분석 실패: ${err instanceof Error ? err.message : err}`);
    } finally {
      setIsLoadingSeo(false);
    }
  };

  // ─── Copy ───

  const handleCopy = () => {
    if (!current) return;
    const html = current.cards
      .map((c) => {
        if (c.type === 'text') return `<p>${c.content}</p>`;
        if (c.type === 'quote') return `<blockquote>${c.content}</blockquote>`;
        if (c.type === 'list') return `<ul>${c.content.split('\n').map((l) => `<li>${l.replace(/^-\s*/, '')}</li>`).join('')}</ul>`;
        if (c.type === 'image' && c.imageUrl) return `<img src="${c.imageUrl}" alt="" />`;
        if (c.type === 'divider') return '<hr />';
        return '';
      })
      .join('\n');
    copyToClipboard(`<h2>${current.title}</h2>\n${html}`);
  };

  // ─── Card editing ───

  const updateCard = (cardId: string, updates: Partial<BlogCard>) => {
    if (!current) return;
    const updated = {
      ...current,
      cards: current.cards.map((c) => (c.id === cardId ? { ...c, ...updates } : c)),
    };
    save(current.id, updated);
  };

  const reorderCards = (fromIdx: number, toIdx: number) => {
    if (!current || fromIdx === toIdx) return;
    const cards = [...current.cards];
    const [moved] = cards.splice(fromIdx, 1);
    cards.splice(toIdx, 0, moved);
    saveNow(current.id, { ...current, cards });
  };

  // ─── SEO score color helper ───

  const scoreColor = (score: number) =>
    score >= 80 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600';

  const scoreBgColor = (score: number) =>
    score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500';

  const scoreBadgeColor = (score: number) =>
    score >= 80 ? 'bg-green-100 text-green-700' : score >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';

  // ════════════════════════════════════════════════
  // Phase 1: Keyword Research (no blog content yet)
  // ════════════════════════════════════════════════

  if (!current && !isGenerating) {
    return (
      <div className="p-5 space-y-4">
        {/* Keyword research panel */}
        <div className="bg-blue-50 rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-blue-800">키워드 연구</h3>
            <button
              className="px-3 py-1.5 bg-blue-500 text-white rounded-md text-xs font-medium hover:bg-blue-600 disabled:opacity-50"
              onClick={handleSuggestKeywords}
              disabled={isLoadingKeywords}
            >
              {isLoadingKeywords ? (
                <span className="flex items-center gap-1">
                  <Spinner /> 분석 중...
                </span>
              ) : (
                '🔍 키워드 추천'
              )}
            </button>
          </div>

          {/* Suggested keywords as chips */}
          {suggestedKeywords.length > 0 && (
            <div className="space-y-3">
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
                    <input
                      type="checkbox"
                      checked={selectedKeywords.has(kw)}
                      onChange={() => toggleKeyword(kw)}
                      className="sr-only"
                    />
                    {kw}
                  </label>
                ))}
              </div>

              {/* Fetch keyword data */}
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-1.5 bg-white text-blue-600 border border-blue-300 rounded-md text-xs font-medium hover:bg-blue-100 disabled:opacity-50"
                  onClick={handleFetchKeywordData}
                  disabled={isLoadingKeywordData || selectedKeywords.size === 0}
                >
                  {isLoadingKeywordData ? (
                    <span className="flex items-center gap-1">
                      <Spinner /> 조회 중...
                    </span>
                  ) : (
                    '📊 검색량 조회'
                  )}
                </button>
                <span className="text-[10px] text-blue-500">{selectedKeywords.size}개 선택</span>
              </div>

              {/* Keyword data table */}
              {keywordDataMap.size > 0 && (
                <div className="bg-white rounded-lg border border-blue-100 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-blue-50 text-blue-700">
                        <th className="px-3 py-2 text-left w-8">
                          <input
                            type="checkbox"
                            checked={suggestedKeywords.filter((kw) => keywordDataMap.has(kw)).every((kw) => selectedKeywords.has(kw))}
                            onChange={(e) => {
                              const dataKeywords = suggestedKeywords.filter((kw) => keywordDataMap.has(kw));
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
                            <input
                              type="checkbox"
                              checked={selectedKeywords.has(d.keyword)}
                              onChange={() => toggleKeyword(d.keyword)}
                            />
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
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Generate button */}
        <div className="flex items-center gap-3">
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded-md text-xs font-medium hover:bg-blue-600 disabled:opacity-50"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            ✨ AI 블로그 생성
          </button>
          <ChannelModelSelector type="text" value={modelId} onChange={setModelId} label="모델:" />
        </div>
        <p className="text-xs text-gray-400">키워드를 선택한 후 AI 블로그를 생성하면 SEO에 최적화된 포스트가 만들어집니다.</p>
      </div>
    );
  }

  // ════════════════════════════════════════════════
  // Phase 2 & 3: Content Editor + SEO Analysis
  // ════════════════════════════════════════════════

  return (
    <div className="flex flex-col h-full">
      {/* Action bar */}
      <div className="px-5 py-3 border-b border-gray-200 flex items-center gap-2 flex-wrap">
        <button
          className="px-3 py-1.5 bg-blue-500 text-white rounded-md text-xs hover:bg-blue-600 disabled:opacity-50"
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? '⏳ 생성 중...' : '✨ AI 재생성'}
        </button>
        <button className="px-3 py-1.5 border border-gray-200 rounded-md text-xs hover:bg-gray-50" onClick={() => setShowPreview(true)}>
          👁 미리보기
        </button>
        <button className="px-3 py-1.5 border border-gray-200 rounded-md text-xs hover:bg-gray-50" onClick={handleCopy}>
          📋 복사
        </button>
        <button
          className="px-3 py-1.5 border border-gray-200 rounded-md text-xs hover:bg-gray-50 disabled:opacity-50"
          onClick={handleSeoAnalysis}
          disabled={isLoadingSeo}
        >
          {isLoadingSeo ? '⏳ 분석 중...' : '📊 SEO 분석'}
        </button>
        {current?.seoScore != null && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${scoreBadgeColor(current.seoScore)}`}>
            SEO {current.seoScore}점
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <ChannelModelSelector type="text" value={modelId} onChange={setModelId} label="모델:" />
          <ChannelModelSelector type="image" value={imageModelId} onChange={setImageModelId} label="이미지:" />
        </div>
      </div>

      {/* SEO Analysis Panel (collapsible) */}
      {showSeoPanel && (
        <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-gray-700">SEO 분석 결과</h4>
            <button className="text-[10px] text-gray-400 hover:text-gray-600" onClick={() => setShowSeoPanel(false)}>
              접기 ✕
            </button>
          </div>
          {isLoadingSeo ? (
            <div className="flex items-center gap-2 py-4 justify-center text-xs text-gray-400">
              <Spinner /> SEO 분석 중...
            </div>
          ) : seoResult ? (
            <div className="space-y-3">
              {/* Total score */}
              <div className="flex items-center gap-3">
                <span className={`text-3xl font-bold ${scoreColor(seoResult.score)}`}>
                  {seoResult.score}
                </span>
                <span className="text-xs text-gray-500">/ 100점</span>
              </div>
              {/* Detail bars */}
              <div className="space-y-2">
                {seoResult.details.map((d) => {
                  const pct = d.maxScore > 0 ? Math.round((d.score / d.maxScore) * 100) : 0;
                  return (
                    <div key={d.category}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[11px] font-medium text-gray-700">{d.label}</span>
                        <span className="text-[10px] text-gray-500">{d.score}/{d.maxScore}</span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${scoreBgColor(pct)}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">{d.message}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {current && (
        <div className="flex-1 overflow-y-auto p-5">
          {/* SEO section */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="flex gap-3 items-center flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="text-[10px] text-gray-400 mb-1">블로그 제목</div>
                <input
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs"
                  value={current.title}
                  onChange={(e) => save(current.id, { ...current, title: e.target.value })}
                />
              </div>
              <div className="min-w-[150px]">
                <div className="text-[10px] text-gray-400 mb-1">
                  주요 키워드 <span className="text-blue-500">(첫 번째 = 메인)</span>
                </div>
                <input
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs"
                  value={current.seoKeywords.join(', ')}
                  onChange={(e) => save(current.id, { ...current, seoKeywords: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                  placeholder="메인키워드, 서브1, 서브2"
                />
              </div>
            </div>
            {current.seoKeywords.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {current.seoKeywords.map((kw, i) => (
                  <span
                    key={kw}
                    className={`text-[10px] px-2 py-0.5 rounded-full ${
                      i === 0 ? 'bg-blue-100 text-blue-700 font-semibold' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {i === 0 ? '🎯 ' : ''}{kw}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Cards */}
          {current.cards.map((card, idx) => (
            <div
              key={card.id}
              draggable
              onDragStart={() => { dragRef.current = idx; }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(idx); }}
              onDragEnd={() => { setDragOver(null); }}
              onDrop={() => { if (dragRef.current !== null) reorderCards(dragRef.current, idx); dragRef.current = null; setDragOver(null); }}
              className={`border border-gray-200 rounded-lg mb-2 overflow-hidden transition-all ${dragOver === idx ? 'border-t-2 border-t-blue-400' : ''}`}
            >
              <div className="px-3 py-2 bg-gray-50 flex items-center gap-2 border-b border-gray-100">
                <span className="cursor-grab text-gray-300 hover:text-gray-500 text-xs select-none">⠿</span>
                <span className={`text-[11px] px-1.5 py-0.5 rounded ${
                  card.type === 'text' ? 'bg-blue-100' :
                  card.type === 'image' ? 'bg-pink-100' :
                  card.type === 'quote' ? 'bg-purple-100' :
                  card.type === 'list' ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {card.type}
                </span>
              </div>
              <div className="p-3">
                {card.type === 'divider' ? (
                  <hr className="border-gray-200" />
                ) : card.type === 'image' ? (
                  <div className="flex items-center gap-3">
                    {card.imageUrl ? (
                      <img src={card.imageUrl} alt="" className="w-[120px] h-[68px] object-cover rounded" />
                    ) : (
                      <div className="w-[120px] h-[68px] bg-gray-100 rounded flex items-center justify-center text-[10px] text-gray-400">
                        이미지 없음
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-400">{card.imagePrompt || '이미지 프롬프트 없음'}</div>
                      {card.imagePrompt && (
                        <button
                          className="mt-1 px-2 py-1 bg-pink-500 text-white rounded text-[10px] hover:bg-pink-600 disabled:opacity-50"
                          disabled={genImage.isPending}
                          onClick={() => genImage.mutate({ contentId: content.id, channel: 'blog', targetId: card.id, imagePrompt: card.imagePrompt!, modelId: imageModelId })}
                        >
                          {genImage.isPending ? '⏳ 생성 중...' : '🎨 이미지 생성'}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <textarea
                    className="w-full text-sm border-none resize-y min-h-[60px] focus:outline-none"
                    value={card.content}
                    onChange={(e) => updateCard(card.id, { content: e.target.value })}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview modal */}
      {showPreview && current && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowPreview(false)}>
          <div className="bg-white rounded-xl w-[600px] max-h-[80vh] overflow-y-auto p-8 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">{current.title}</h2>
            <div className="prose prose-sm max-w-none">
              {current.cards.map((card) => (
                <div key={card.id}>
                  {card.type === 'text' && <p>{card.content}</p>}
                  {card.type === 'quote' && <blockquote className="border-l-4 border-gray-300 pl-4 italic">{card.content}</blockquote>}
                  {card.type === 'list' && (
                    <ul>{card.content.split('\n').map((l, i) => <li key={i}>{l.replace(/^-\s*/, '')}</li>)}</ul>
                  )}
                  {card.type === 'image' && card.imageUrl && <img src={card.imageUrl} alt="" className="rounded-lg" />}
                  {card.type === 'divider' && <hr />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
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
