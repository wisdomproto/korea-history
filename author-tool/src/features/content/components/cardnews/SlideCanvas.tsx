import { useState, useRef, useEffect } from 'react';
import type { InstagramSlide } from '../../../../lib/content-types';

// fontSize is stored relative to BASE_W. All rendering scales by containerWidth / BASE_W.
export const BASE_W = 1080;

export function SlideCanvas({ slide, className }: { slide: InstagramSlide; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const canvas = slide.canvas;
  const imgUrl = canvas?.imageUrl || slide.imageUrl;

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / BASE_W));
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={`aspect-[4/5] relative overflow-hidden ${className || ''}`} style={{ backgroundColor: canvas?.bgColor || '#18181b' }}>
      {imgUrl && (
        <img src={imgUrl} className="absolute w-full object-contain"
          style={{ top: `${canvas?.imageY || 50}%`, transform: 'translateY(-50%)' }} />
      )}
      {canvas?.textBlocks ? (
        canvas.textBlocks.filter((b) => !b.hidden).map((block) => (
          <div key={block.id} className="absolute overflow-hidden" style={{
            left: `${block.x}%`, top: `${block.y}%`, width: `${block.width}%`,
            fontSize: `${block.fontSize * scale}px`, color: block.color,
            fontWeight: block.fontWeight, textAlign: block.textAlign,
            lineHeight: 1.4,
            textShadow: block.shadow ? `0 ${2 * scale}px ${8 * scale}px rgba(0,0,0,0.7)` : 'none',
            whiteSpace: 'pre-wrap',
          }}>
            {block.text || `(${block.id})`}
          </div>
        ))
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white p-2 text-center">
          <div style={{ fontSize: `${14 * scale}px` }}>{slide.textOverlay}</div>
        </div>
      )}
    </div>
  );
}
