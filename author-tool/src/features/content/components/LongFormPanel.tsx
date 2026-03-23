// author-tool/src/features/content/components/LongFormPanel.tsx
import { useState } from 'react';
import type { ContentFile, LongFormContent } from '../../../lib/content-types';
import { useGenerateImage } from '../hooks/useContent';
import { useDebouncedSave } from '../hooks/useDebouncedSave';
import { copyToClipboard } from '../api/content.api';
import { useChannelGeneration } from '../hooks/useChannelGeneration';
import { ChannelModelSelector } from './ChannelModelSelector';

interface Props {
  contentFile: ContentFile;
}

const SECTION_STYLES: Record<string, { bg: string; color: string }> = {
  intro: { bg: 'bg-amber-100', color: 'text-amber-700' },
  main: { bg: 'bg-blue-100', color: 'text-blue-700' },
  transition: { bg: 'bg-purple-100', color: 'text-purple-700' },
  cta: { bg: 'bg-green-100', color: 'text-green-700' },
  outro: { bg: 'bg-gray-100', color: 'text-gray-700' },
};

export function LongFormPanel({ contentFile }: Props) {
  const { content, longForm } = contentFile;
  const current = longForm[0] as LongFormContent | undefined;
  const [modelId, setModelId] = useState('gemini-2.5-flash');
  const [imageModelId, setImageModelId] = useState('gemini-2.5-flash-image');
  const [expandedScene, setExpandedScene] = useState<string | null>(null);

  const { save } = useDebouncedSave(content.id, 'longform');
  const genImage = useGenerateImage();
  const { isGenerating, generate } = useChannelGeneration({
    contentId: content.id,
    path: 'generate/longform',
  });

  const handleGenerate = () => {
    generate({ modelId, targetDuration: '8~12분' });
  };

  const handleCopy = () => {
    if (!current) return;
    const text = current.scenes.map((s, i) =>
      `[씬 ${i + 1}: ${s.title}] (${s.sectionType})\n나레이션: ${s.narration}\n화면: ${s.direction}`
    ).join('\n\n');
    copyToClipboard(`${current.videoTitle}\n\n${text}`, '대본이 복사되었습니다!');
  };

  const updateScene = (sceneId: string, updates: any) => {
    if (!current) return;
    save(current.id, { ...current, scenes: current.scenes.map((s) => (s.id === sceneId ? { ...s, ...updates } : s)) });
  };

  if (!current && !isGenerating) {
    return (
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <button className="px-4 py-1.5 bg-amber-500 text-white rounded-md text-xs font-medium hover:bg-amber-600" onClick={handleGenerate}>
            ✨ AI 대본 생성
          </button>
          <ChannelModelSelector type="text" value={modelId} onChange={setModelId} label="모델:" />
          <span className="text-[10px] text-gray-400">목표: 8~12분</span>
        </div>
        <p className="text-sm text-gray-400">기본글을 기반으로 유튜브 롱폼 대본을 생성합니다.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3 border-b border-gray-200 flex items-center gap-2">
        <button className="px-3 py-1.5 bg-amber-500 text-white rounded-md text-xs hover:bg-amber-600 disabled:opacity-50" onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? '⏳ 생성 중...' : '✨ AI 대본'}
        </button>
        <button className="px-3 py-1.5 border border-gray-200 rounded-md text-xs hover:bg-gray-50" onClick={handleCopy}>📋 복사</button>
        <span className="text-[10px] text-gray-400 ml-auto">목표: {current?.targetDuration || '8~12분'}</span>
        <ChannelModelSelector type="text" value={modelId} onChange={setModelId} label="글:" />
        <ChannelModelSelector type="image" value={imageModelId} onChange={setImageModelId} label="이미지:" />
      </div>

      {current && (
        <div className="flex-1 overflow-y-auto p-5">
          {current.scenes.map((scene, i) => {
            const style = SECTION_STYLES[scene.sectionType] || SECTION_STYLES.main;
            const isExpanded = expandedScene === scene.id;
            return (
              <div
                key={scene.id}
                className={`border rounded-lg mb-2 overflow-hidden cursor-pointer ${isExpanded ? 'border-amber-300' : 'border-gray-200'}`}
                onClick={() => setExpandedScene(isExpanded ? null : scene.id)}
              >
                <div className="flex gap-2 p-2 items-center">
                  <div className={`w-14 h-8 rounded flex items-center justify-center text-[8px] ${style.bg} ${style.color} flex-shrink-0`}>
                    {scene.sectionType}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold truncate">{scene.title}</div>
                    {!isExpanded && (
                      <div className="text-[10px] text-gray-400 truncate">{scene.narration.slice(0, 80)}...</div>
                    )}
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                    <div>
                      <div className="text-[10px] text-gray-400 mb-1">제목</div>
                      <input className="w-full px-2 py-1 border border-gray-200 rounded text-xs" value={scene.title} onChange={(e) => updateScene(scene.id, { title: e.target.value })} />
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-400 mb-1">나레이션</div>
                      <textarea className="w-full px-2 py-1 border border-gray-200 rounded text-xs resize-y min-h-[80px]" value={scene.narration} onChange={(e) => updateScene(scene.id, { narration: e.target.value })} />
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-400 mb-1">화면 지시</div>
                      <textarea className="w-full px-2 py-1 border border-gray-200 rounded text-xs resize-y min-h-[40px]" value={scene.direction} onChange={(e) => updateScene(scene.id, { direction: e.target.value })} />
                    </div>
                    {(scene.imagePrompt || scene.imageUrl) && (
                      <div className="flex items-center gap-3">
                        {scene.imageUrl && (
                          <img src={scene.imageUrl} alt="" className="w-[100px] h-[56px] object-cover rounded" />
                        )}
                        {scene.imagePrompt && (
                          <button
                            className="px-2 py-1 bg-amber-500 text-white rounded text-[10px] hover:bg-amber-600 disabled:opacity-50"
                            disabled={genImage.isPending}
                            onClick={() => genImage.mutate({ contentId: content.id, channel: 'longform', targetId: scene.id, imagePrompt: scene.imagePrompt!, modelId: imageModelId })}
                          >
                            {genImage.isPending ? '⏳ 생성 중...' : '🎨 씬 이미지 생성'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
