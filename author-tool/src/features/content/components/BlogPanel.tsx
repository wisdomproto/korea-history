// author-tool/src/features/content/components/BlogPanel.tsx
import { useState } from 'react';
import type { ContentFile, BlogContent, BlogCard } from '../../../lib/content-types';
import { useGenerateImage } from '../hooks/useContent';
import { useDebouncedSave } from '../hooks/useDebouncedSave';
import { useChannelGeneration } from '../hooks/useChannelGeneration';
import { ChannelModelSelector } from './ChannelModelSelector';

interface Props {
  contentFile: ContentFile;
}

export function BlogPanel({ contentFile }: Props) {
  const { content, blog } = contentFile;
  const current = blog[0] as BlogContent | undefined;
  const [modelId, setModelId] = useState('gemini-2.5-flash');
  const [imageModelId, setImageModelId] = useState('gemini-2.5-flash-image');
  const [showPreview, setShowPreview] = useState(false);

  const { save } = useDebouncedSave(content.id, 'blog');
  const genImage = useGenerateImage();
  const { isGenerating, generate } = useChannelGeneration({
    contentId: content.id,
    path: 'generate/blog',
  });

  const handleGenerate = () => {
    generate({ modelId });
  };

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
    navigator.clipboard.writeText(`<h2>${current.title}</h2>\n${html}`);
    alert('클립보드에 복사되었습니다!');
  };

  const updateCard = (cardId: string, updates: Partial<BlogCard>) => {
    if (!current) return;
    const updated = {
      ...current,
      cards: current.cards.map((c) => (c.id === cardId ? { ...c, ...updates } : c)),
    };
    save(current.id, updated);
  };

  // SEO score badge helper
  const renderSeoScore = () => {
    if (!current?.seoScore) return null;
    const score = current.seoScore;
    const color = score >= 80 ? 'bg-green-100 text-green-700' : score >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
    return (
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${color}`}>
        SEO {score}점
      </span>
    );
  };

  if (!current && !isGenerating) {
    return (
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <button
            className="px-4 py-1.5 bg-blue-500 text-white rounded-md text-xs font-medium hover:bg-blue-600"
            onClick={handleGenerate}
          >
            ✨ AI 블로그 생성
          </button>
          <ChannelModelSelector type="text" value={modelId} onChange={setModelId} label="모델:" />
        </div>
        <p className="text-sm text-gray-400">기본글을 기반으로 블로그 포스트를 생성합니다.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Action bar */}
      <div className="px-5 py-3 border-b border-gray-200 flex items-center gap-2 flex-wrap">
        <button
          className="px-3 py-1.5 bg-blue-500 text-white rounded-md text-xs hover:bg-blue-600 disabled:opacity-50"
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? '⏳ 생성 중...' : '✨ AI 블로그 생성'}
        </button>
        <button className="px-3 py-1.5 border border-gray-200 rounded-md text-xs hover:bg-gray-50" onClick={() => setShowPreview(true)}>
          👁 미리보기
        </button>
        <button className="px-3 py-1.5 border border-gray-200 rounded-md text-xs hover:bg-gray-50" onClick={handleCopy}>
          📋 복사
        </button>
        {renderSeoScore()}
        <div className="ml-auto flex items-center gap-2">
          <ChannelModelSelector type="text" value={modelId} onChange={setModelId} label="모델:" />
          <ChannelModelSelector type="image" value={imageModelId} onChange={setImageModelId} label="이미지:" />
        </div>
      </div>

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
                <div className="text-[10px] text-gray-400 mb-1">SEO 키워드</div>
                <input
                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs"
                  value={current.seoKeywords.join(', ')}
                  onChange={(e) => save(current.id, { ...current, seoKeywords: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                />
              </div>
            </div>
          </div>

          {/* Cards */}
          {current.cards.map((card) => (
            <div key={card.id} className="border border-gray-200 rounded-lg mb-2 overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 flex items-center gap-2 border-b border-gray-100">
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
