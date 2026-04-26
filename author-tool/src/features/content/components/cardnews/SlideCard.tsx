import type { InstagramSlide } from '../../../../lib/content-types';
import { SlideCanvas } from './SlideCanvas';

export function SlideCard({ slide, index, isSelected, onSelect, onDelete, onGenerateImage, onDeleteImage, onSaveImage, isGeneratingImage, commonTitleSize }: {
  slide: InstagramSlide;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onGenerateImage: () => void;
  onDeleteImage: () => void;
  onSaveImage: () => void;
  isGeneratingImage: boolean;
  commonTitleSize?: number;
}) {
  const hasImage = !!(slide.canvas?.imageUrl || slide.imageUrl);

  return (
    <div
      className={`border rounded-lg overflow-hidden cursor-pointer transition-all ${
        isSelected ? 'border-pink-500 ring-2 ring-pink-200' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onSelect}
    >
      <SlideCanvas slide={slide} commonTitleSize={commonTitleSize} />

      {/* Footer */}
      <div className="p-1.5 bg-white space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-gray-500">{index + 1}. {slide.type}</span>
          <div className="flex gap-1">
            {slide.imagePrompt && (
              <button className="px-1.5 py-0.5 bg-pink-500 text-white rounded text-[8px] hover:bg-pink-600 disabled:opacity-50"
                disabled={isGeneratingImage} onClick={(e) => { e.stopPropagation(); onGenerateImage(); }}
                title="이미지 생성">{isGeneratingImage ? '⏳' : '🎨'}</button>
            )}
            <button className="px-1.5 py-0.5 bg-blue-500 text-white rounded text-[8px] hover:bg-blue-600"
              onClick={(e) => { e.stopPropagation(); onSaveImage(); }} title="카드 이미지로 저장">💾</button>
            {hasImage && (
              <button className="px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded text-[8px] hover:bg-gray-300"
                onClick={(e) => { e.stopPropagation(); onDeleteImage(); }} title="이미지 삭제">🗑</button>
            )}
            <button className="px-1 py-0.5 text-red-400 rounded text-[8px] hover:bg-red-50"
              onClick={(e) => { e.stopPropagation(); onDelete(); }} title="슬라이드 삭제">✕</button>
          </div>
        </div>
        {slide.imagePrompt && (
          <div className="text-[8px] text-gray-400 truncate" title={slide.imagePrompt}>🖼 {slide.imagePrompt}</div>
        )}
      </div>
    </div>
  );
}
