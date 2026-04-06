import type { CardNewsTemplate } from '../../../lib/content-types';

export const CARD_NEWS_TEMPLATES: CardNewsTemplate[] = [
  {
    id: 'dark-modern',
    name: '다크 모던',
    canvas: {
      bgColor: '#18181b',
      imageUrl: null,
      imageY: 50,
      textBlocks: [
        { id: 'title', text: '', x: 8, y: 10, fontSize: 26, color: '#ffffff', fontWeight: 'bold', textAlign: 'left', width: 84, shadow: true },
        { id: 'body', text: '', x: 8, y: 55, fontSize: 14, color: '#cccccc', fontWeight: 'normal', textAlign: 'left', width: 84, shadow: false },
      ],
    },
  },
  {
    id: 'clean-white',
    name: '클린 화이트',
    canvas: {
      bgColor: '#ffffff',
      imageUrl: null,
      imageY: 50,
      textBlocks: [
        { id: 'title', text: '', x: 8, y: 10, fontSize: 26, color: '#1a1a1a', fontWeight: 'bold', textAlign: 'left', width: 84, shadow: false },
        { id: 'body', text: '', x: 8, y: 55, fontSize: 14, color: '#555555', fontWeight: 'normal', textAlign: 'left', width: 84, shadow: false },
      ],
    },
  },
  {
    id: 'emerald-brand',
    name: '에메랄드 브랜드',
    canvas: {
      bgColor: '#064e3b',
      imageUrl: null,
      imageY: 50,
      textBlocks: [
        { id: 'title', text: '', x: 8, y: 10, fontSize: 26, color: '#ecfdf5', fontWeight: 'bold', textAlign: 'left', width: 84, shadow: true },
        { id: 'body', text: '', x: 8, y: 55, fontSize: 14, color: '#a7f3d0', fontWeight: 'normal', textAlign: 'left', width: 84, shadow: false },
      ],
    },
  },
  {
    id: 'bold-center',
    name: '볼드 센터',
    canvas: {
      bgColor: '#0f172a',
      imageUrl: null,
      imageY: 50,
      textBlocks: [
        { id: 'title', text: '', x: 5, y: 20, fontSize: 32, color: '#ffffff', fontWeight: 'bold', textAlign: 'center', width: 90, shadow: true },
        { id: 'body', text: '', x: 10, y: 60, fontSize: 15, color: '#94a3b8', fontWeight: 'normal', textAlign: 'center', width: 80, shadow: false },
      ],
    },
  },
  {
    id: 'photo-overlay',
    name: '포토 오버레이',
    canvas: {
      bgColor: '#000000',
      imageUrl: null,
      imageY: 50,
      textBlocks: [
        { id: 'title', text: '', x: 8, y: 65, fontSize: 24, color: '#ffffff', fontWeight: 'bold', textAlign: 'left', width: 84, shadow: true },
        { id: 'body', text: '', x: 8, y: 82, fontSize: 13, color: '#e2e8f0', fontWeight: 'normal', textAlign: 'left', width: 84, shadow: true },
      ],
    },
  },
  {
    id: 'warm-vintage',
    name: '웜 빈티지',
    canvas: {
      bgColor: '#451a03',
      imageUrl: null,
      imageY: 50,
      textBlocks: [
        { id: 'title', text: '', x: 8, y: 10, fontSize: 26, color: '#fef3c7', fontWeight: 'bold', textAlign: 'left', width: 84, shadow: true },
        { id: 'body', text: '', x: 8, y: 55, fontSize: 14, color: '#fde68a', fontWeight: 'normal', textAlign: 'left', width: 84, shadow: false },
      ],
    },
  },
];

export function getDefaultCanvas() {
  return CARD_NEWS_TEMPLATES[0].canvas;
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
