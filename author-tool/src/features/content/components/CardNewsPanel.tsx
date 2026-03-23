// author-tool/src/features/content/components/CardNewsPanel.tsx
import { useState } from 'react';
import type { ContentFile, InstagramContent } from '../../../lib/content-types';
import { useSaveChannelContent, useRefreshContent } from '../hooks/useContent';
import { generateSSE } from '../api/content.api';
import { ChannelModelSelector } from './ChannelModelSelector';

interface Props {
  contentFile: ContentFile;
}

export function CardNewsPanel({ contentFile }: Props) {
  const { content, instagram } = contentFile;
  const current = instagram[0] as InstagramContent | undefined;
  const [isGenerating, setIsGenerating] = useState(false);
  const [textModelId, setTextModelId] = useState('gemini-2.5-flash');
  const [imageModelId, setImageModelId] = useState('gemini-2.5-flash-image');

  const saveChannel = useSaveChannelContent();
  const refreshContent = useRefreshContent();

  const handleGenerate = () => {
    setIsGenerating(true);
    generateSSE(content.id, 'generate/instagram', { modelId: textModelId }, {
      onComplete: () => { refreshContent(content.id); setIsGenerating(false); },
      onError: (msg) => { alert(`생성 실패: ${msg}`); setIsGenerating(false); },
    });
  };

  if (!current && !isGenerating) {
    return (
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <button className="px-4 py-1.5 bg-pink-500 text-white rounded-md text-xs font-medium hover:bg-pink-600" onClick={handleGenerate}>
            ✨ AI 카드뉴스 생성
          </button>
          <ChannelModelSelector type="text" value={textModelId} onChange={setTextModelId} label="텍스트:" />
          <ChannelModelSelector type="image" value={imageModelId} onChange={setImageModelId} label="이미지:" />
        </div>
        <p className="text-sm text-gray-400">기본글을 기반으로 인스타그램 카드뉴스를 생성합니다.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3 border-b border-gray-200 flex items-center gap-2 flex-wrap">
        <button className="px-3 py-1.5 bg-pink-500 text-white rounded-md text-xs hover:bg-pink-600 disabled:opacity-50" onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? '⏳ 생성 중...' : '✨ AI 카드뉴스 생성'}
        </button>
        <div className="ml-auto flex items-center gap-2">
          <ChannelModelSelector type="text" value={textModelId} onChange={setTextModelId} label="텍스트:" />
          <ChannelModelSelector type="image" value={imageModelId} onChange={setImageModelId} label="이미지:" />
        </div>
      </div>

      {current && (
        <div className="flex-1 overflow-y-auto p-5">
          {/* Caption & Hashtags */}
          <div className="bg-pink-50 rounded-lg p-3 mb-4">
            <div className="text-[10px] text-gray-400 mb-1">캡션</div>
            <textarea
              className="w-full text-xs border border-gray-200 rounded p-2 resize-none min-h-[40px] mb-2"
              value={current.caption}
              onChange={(e) =>
                saveChannel.mutate({
                  id: content.id, channel: 'instagram', channelContentId: current.id,
                  data: { ...current, caption: e.target.value },
                })
              }
            />
            <div className="text-[10px] text-gray-400 mb-1">해시태그</div>
            <input
              className="w-full text-xs border border-gray-200 rounded p-2 text-blue-500"
              value={current.hashtags.join(' ')}
              onChange={(e) =>
                saveChannel.mutate({
                  id: content.id, channel: 'instagram', channelContentId: current.id,
                  data: { ...current, hashtags: e.target.value.split(/\s+/).filter(Boolean) },
                })
              }
            />
          </div>

          {/* Slides grid */}
          <div className="grid grid-cols-4 gap-3">
            {current.slides.map((slide, i) => (
              <div key={slide.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="aspect-square bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white p-2 text-center">
                  <div className="text-[10px] leading-relaxed">{slide.textOverlay}</div>
                </div>
                <div className="p-2 text-center text-[10px] text-gray-500">
                  {i + 1}. {slide.type}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
