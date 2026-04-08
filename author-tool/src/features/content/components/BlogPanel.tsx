// author-tool/src/features/content/components/BlogPanel.tsx
import { useState, useRef } from 'react';
import type { ContentFile, BlogContent, BlogCard } from '../../../lib/content-types';
import { apiPost } from '../../../lib/axios';
import { useGenerateImage, useDeleteChannelContent } from '../hooks/useContent';
import { copyToClipboard } from '../api/content.api';
import { useDebouncedSave } from '../hooks/useDebouncedSave';
import { useChannelGeneration } from '../hooks/useChannelGeneration';
import { ChannelModelSelector } from './ChannelModelSelector';
import { KeywordPanel } from './blog/KeywordPanel';
import { BlogCardEditor } from './blog/BlogCardEditor';
import { BlogPreview } from './blog/BlogPreview';

// ─── Local types ───

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
  const [imageStyle, setImageStyle] = useState('photorealistic');

  // Keyword state (shared with KeywordPanel)
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());
  const [showKeywordPanel, setShowKeywordPanel] = useState(!blog[0]);

  // SEO analysis state
  const [seoResult, setSeoResult] = useState<SeoResult | null>(null);
  const [isLoadingSeo, setIsLoadingSeo] = useState(false);
  const [showSeoPanel, setShowSeoPanel] = useState(false);

  const { save, saveNow } = useDebouncedSave(content.id, 'blog');
  const genImage = useGenerateImage();
  const deleteBlog = useDeleteChannelContent();
  const dragRef = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const { isGenerating, generate } = useChannelGeneration({
    contentId: content.id,
    path: 'generate/blog',
  });

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

  const deleteCard = (cardId: string) => {
    if (!current) return;
    saveNow(current.id, { ...current, cards: current.cards.filter((c) => c.id !== cardId) });
  };

  const addCard = () => {
    if (!current) return;
    const newCard = { id: `bc-${Date.now()}`, type: 'text' as const, content: '', imagePrompt: '' };
    saveNow(current.id, { ...current, cards: [...current.cards, newCard] });
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
  // Main Render
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
          className={`px-3 py-1.5 border rounded-md text-xs hover:bg-gray-50 ${showKeywordPanel ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200'}`}
          onClick={() => setShowKeywordPanel(!showKeywordPanel)}
        >
          🔍 키워드
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
          {current && (
            <button
              className="px-3 py-1.5 border border-red-200 text-red-500 rounded-md text-xs hover:bg-red-50"
              onClick={() => {
                if (!confirm('블로그를 삭제하시겠습니까?')) return;
                deleteBlog.mutate({ id: content.id, channel: 'blog', channelContentId: current.id });
              }}
            >
              🗑 삭제
            </button>
          )}
        </div>
      </div>

      {/* Keyword Research Panel (collapsible) */}
      {showKeywordPanel && (
        <KeywordPanel
          topic={content.title}
          baseArticleHtml={baseArticle?.html}
          selectedKeywords={selectedKeywords}
          setSelectedKeywords={setSelectedKeywords}
          isGenerating={isGenerating}
          hasCurrent={!!current}
          onGenerate={() => { handleGenerate(); setShowKeywordPanel(false); }}
        />
      )}

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

          {/* Image style selector */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] text-gray-400">이미지 스타일:</span>
            <select
              className="px-2 py-1 border border-gray-200 rounded text-xs"
              value={imageStyle}
              onChange={(e) => setImageStyle(e.target.value)}
            >
              <option value="photorealistic">사실적</option>
              <option value="illustration">일러스트</option>
              <option value="minimal flat design">미니멀</option>
              <option value="watercolor">수채화</option>
              <option value="cartoon anime">만화</option>
            </select>
          </div>

          {/* Cards */}
          {current.cards.map((card, idx) => (
            <BlogCardEditor
              key={card.id}
              card={card}
              idx={idx}
              dragOver={dragOver}
              imageStyle={imageStyle}
              imageModelId={imageModelId}
              contentId={content.id}
              genImagePending={genImage.isPending}
              onDragStart={(i) => { dragRef.current = i; }}
              onDragOver={(e, i) => { e.preventDefault(); setDragOver(i); }}
              onDragEnd={() => { setDragOver(null); }}
              onDrop={(i) => { if (dragRef.current !== null) reorderCards(dragRef.current, i); dragRef.current = null; setDragOver(null); }}
              onUpdateCard={updateCard}
              onDeleteCard={deleteCard}
              onGenerateImage={(params) => genImage.mutate(params)}
            />
          ))}

          {/* Add card button */}
          <button
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-xs text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
            onClick={addCard}
          >
            + 카드 추가
          </button>
        </div>
      )}

      {/* Preview modal */}
      {showPreview && current && (
        <BlogPreview current={current} onClose={() => setShowPreview(false)} />
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
