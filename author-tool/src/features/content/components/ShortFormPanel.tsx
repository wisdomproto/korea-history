// author-tool/src/features/content/components/ShortFormPanel.tsx
import { useState } from 'react';
import type { ContentFile, ShortFormContent } from '../../../lib/content-types';
import { useDebouncedSave } from '../hooks/useDebouncedSave';
import { useChannelGeneration } from '../hooks/useChannelGeneration';
import { copyToClipboard } from '../api/content.api';
import { ChannelModelSelector } from './ChannelModelSelector';

interface Props {
  contentFile: ContentFile;
}

export function ShortFormPanel({ contentFile }: Props) {
  const { content, shortForm } = contentFile;
  const current = shortForm[0] as ShortFormContent | undefined;
  const [modelId, setModelId] = useState('gemini-2.5-flash');

  const { save } = useDebouncedSave(content.id, 'shortform');
  const { isGenerating, generate } = useChannelGeneration({
    contentId: content.id,
    path: 'generate/shortform',
  });

  const handleGenerate = () => {
    generate({ modelId, targetDuration: '30~60초' });
  };

  const handleCopy = () => {
    if (!current) return;
    copyToClipboard(`[Hook]\n${current.hook}\n\n[본문]\n${current.body}\n\n[CTA]\n${current.cta}\n\n[화면 지시]\n${current.direction}`, '대본이 복사되었습니다!');
  };

  const updateField = (field: string, value: string) => {
    if (!current) return;
    save(current.id, { ...current, [field]: value });
  };

  if (!current && !isGenerating) {
    return (
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <button className="px-4 py-1.5 bg-orange-500 text-white rounded-md text-xs font-medium hover:bg-orange-600" onClick={handleGenerate}>
            ✨ AI 대본 생성
          </button>
          <ChannelModelSelector type="text" value={modelId} onChange={setModelId} label="모델:" />
          <span className="text-[10px] text-gray-400">목표: 30~60초</span>
        </div>
        <p className="text-sm text-gray-400">기본글을 기반으로 숏폼 대본을 생성합니다.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3 border-b border-gray-200 flex items-center gap-2">
        <button className="px-3 py-1.5 bg-orange-500 text-white rounded-md text-xs hover:bg-orange-600 disabled:opacity-50" onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? '⏳ 생성 중...' : '✨ AI 대본'}
        </button>
        <button className="px-3 py-1.5 border border-gray-200 rounded-md text-xs hover:bg-gray-50" onClick={handleCopy}>📋 복사</button>
        <span className="text-[10px] text-gray-400 ml-auto">목표: 30~60초</span>
        <ChannelModelSelector type="text" value={modelId} onChange={setModelId} />
      </div>

      {current && (
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <div className="text-[10px] text-gray-400 mb-1">🎯 Hook (0~3초)</div>
            <textarea
              className="w-full border border-gray-200 rounded-lg p-2 text-sm resize-none h-[60px]"
              value={current.hook}
              onChange={(e) => updateField('hook', e.target.value)}
            />
          </div>
          <div>
            <div className="text-[10px] text-gray-400 mb-1">📖 본문 (3~50초)</div>
            <textarea
              className="w-full border border-gray-200 rounded-lg p-2 text-sm resize-y min-h-[120px]"
              value={current.body}
              onChange={(e) => updateField('body', e.target.value)}
            />
          </div>
          <div>
            <div className="text-[10px] text-gray-400 mb-1">📣 CTA (50~60초)</div>
            <textarea
              className="w-full border border-gray-200 rounded-lg p-2 text-sm resize-none h-[60px]"
              value={current.cta}
              onChange={(e) => updateField('cta', e.target.value)}
            />
          </div>
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="text-[10px] text-orange-700 font-bold mb-1">화면 지시</div>
            <textarea
              className="w-full border border-orange-200 rounded p-2 text-xs resize-y min-h-[60px] bg-white"
              value={current.direction}
              onChange={(e) => updateField('direction', e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
