import type { CardNewsTemplate, CardCanvasData } from '../../../lib/content-types';

// No built-in templates — all presets are saved to R2
export const CARD_NEWS_TEMPLATES: CardNewsTemplate[] = [];

export const DEFAULT_CANVAS: CardCanvasData = {
  bgColor: '#18181b',
  imageUrl: null,
  imageY: 50,
  textBlocks: [
    { id: 'title', text: '', x: 8, y: 10, fontSize: 26, color: '#ffffff', fontWeight: 'bold', textAlign: 'left', width: 84, shadow: true },
    { id: 'body', text: '', x: 8, y: 55, fontSize: 14, color: '#cccccc', fontWeight: 'normal', textAlign: 'left', width: 84, shadow: false },
  ],
};

export function getDefaultCanvas() {
  return DEFAULT_CANVAS;
}

export function applyTemplate(template: CardNewsTemplate, title: string, body: string) {
  return {
    ...template.canvas,
    textBlocks: template.canvas.textBlocks.map((block) => ({
      ...block,
      text: block.id === 'title' ? title : block.id === 'body' ? body : block.text,
    })),
  };
}
