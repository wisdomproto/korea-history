import type { InstagramSlide } from '../../../../lib/content-types';
import { SlideCanvas, computeCommonTitleSize } from './SlideCanvas';

interface Props {
  slides: InstagramSlide[];
  previewIdx: number | null;
  setPreviewIdx: (idx: number | null) => void;
}

export function SlidePreviewModal({ slides, previewIdx, setPreviewIdx }: Props) {
  if (previewIdx === null || slides.length === 0) return null;
  const commonTitleSize = computeCommonTitleSize(slides.map((s) => s.title || ''));

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => setPreviewIdx(null)}>
      {/* Card — uses same SlideCanvas component */}
      <div className="relative" style={{ width: '400px' }} onClick={(e) => e.stopPropagation()}>
        <SlideCanvas slide={slides[previewIdx]} className="rounded-xl" commonTitleSize={commonTitleSize} />

        {/* Slide counter */}
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-white text-sm">
          {previewIdx + 1} / {slides.length}
        </div>
      </div>

      {/* Navigation */}
      {previewIdx > 0 && (
        <button
          className="absolute left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 hover:bg-white/40 text-white text-2xl flex items-center justify-center transition-colors"
          onClick={(e) => { e.stopPropagation(); setPreviewIdx(previewIdx - 1); }}
          title="이전 슬라이드"
        >‹</button>
      )}
      {previewIdx < slides.length - 1 && (
        <button
          className="absolute right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 hover:bg-white/40 text-white text-2xl flex items-center justify-center transition-colors"
          onClick={(e) => { e.stopPropagation(); setPreviewIdx(previewIdx + 1); }}
          title="다음 슬라이드"
        >›</button>
      )}

      {/* Close */}
      <button
        className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 text-white text-xl flex items-center justify-center transition-colors"
        onClick={() => setPreviewIdx(null)}
        title="닫기"
      >✕</button>

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            className={`w-2 h-2 rounded-full transition-all ${i === previewIdx ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/60'}`}
            onClick={(e) => { e.stopPropagation(); setPreviewIdx(i); }}
          />
        ))}
      </div>
    </div>
  );
}
