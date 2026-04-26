import type { CardNewsTemplate, CardCanvasData } from '../../../lib/content-types';

// No built-in templates — all presets are saved to R2
export const CARD_NEWS_TEMPLATES: CardNewsTemplate[] = [];

// 디자인 가이드 A 톤 — 페이퍼 베이지 + 세리프 + 앰버 액센트
// 레이아웃: 위(제목) / 중앙(본문) / 아래(브랜드)
export const DEFAULT_CANVAS: CardCanvasData = {
  bgColor: '#F2EDE3',  // paper beige
  imageUrl: null,
  imageY: 50,
  textBlocks: [
    // 위 — 제목 (Noto Serif KR, 88px = 카드 8% — 디자인 가이드 표준)
    { id: 'title', text: '', x: 6, y: 14, fontSize: 88, color: '#1A1612', fontWeight: 'bold', textAlign: 'left', width: 88, shadow: false },
    // 중앙 — 본문 (Pretendard, 44px — 인스타 모바일 가독성)
    { id: 'body', text: '', x: 6, y: 42, fontSize: 44, color: '#3A3128', fontWeight: 'normal', textAlign: 'left', width: 88, shadow: false },
    // 아래 — 브랜드 (Mono, 18px)
    { id: 'brand', text: '● 기출노트 한능검 · gcnote.co.kr', x: 6, y: 92, fontSize: 18, color: '#7A6B5A', fontWeight: 'normal', textAlign: 'left', width: 88, shadow: false },
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
