import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import fs from 'fs';
import { generateText } from './gemini.provider.js';
import { getNoteById, getAllNotes, type Note } from './notes.service.js';
import { AppError } from '../middleware.js';

// Reuse font loading from card-news service
let fontData: ArrayBuffer | null = null;

async function getFont(): Promise<ArrayBuffer> {
  if (fontData) return fontData;
  const candidates = [
    'C:/Windows/Fonts/malgun.ttf',
    'C:/Windows/Fonts/NanumGothic.ttf',
    '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc',
    '/System/Library/Fonts/AppleSDGothicNeo.ttc',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      fontData = fs.readFileSync(p).buffer as ArrayBuffer;
      return fontData;
    }
  }
  const res = await fetch('https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzuoyeLTq8H4hfeE.ttf');
  fontData = await res.arrayBuffer();
  return fontData;
}

const ERA_COLORS: Record<string, { bg1: string; bg2: string }> = {
  '선사·고조선': { bg1: '#F59E0B', bg2: '#D97706' },
  '삼국':       { bg1: '#EF4444', bg2: '#DC2626' },
  '남북국':     { bg1: '#F97316', bg2: '#EA580C' },
  '고려':       { bg1: '#10B981', bg2: '#059669' },
  '조선 전기':  { bg1: '#3B82F6', bg2: '#2563EB' },
  '조선 후기':  { bg1: '#6366F1', bg2: '#4F46E5' },
  '근대':       { bg1: '#8B5CF6', bg2: '#7C3AED' },
  '현대':       { bg1: '#EC4899', bg2: '#DB2777' },
};

async function renderSvgToPng(svg: string): Promise<Buffer> {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1080 } });
  return Buffer.from(resvg.render().asPng());
}

function textNode(text: string, style: any) {
  return { type: 'div', props: { style, children: text } };
}

function makeSlide(elements: any, colors: { bg1: string; bg2: string }) {
  return {
    type: 'div',
    props: {
      style: {
        width: '1080px', height: '1080px', display: 'flex', flexDirection: 'column',
        background: `linear-gradient(135deg, ${colors.bg1} 0%, ${colors.bg2} 100%)`,
        fontFamily: 'NotoSansKR', padding: '60px', position: 'relative',
      },
      children: elements,
    },
  };
}

interface NoteCardRequest {
  noteIds: string[];
  slideCount?: number; // 3~5 slides per note (default 5)
  model?: string;
  ctaUrl?: string;
}

interface NoteSlideResult {
  noteId: string;
  title: string;
  era: string;
  slides: Buffer[];
}

/** Extract plain text from HTML content, removing tags. */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

async function generateNoteSummarySlides(note: Note, slideCount: number, model?: string): Promise<string[]> {
  const plainText = stripHtml(note.content).slice(0, 3000); // limit context

  const prompt = `한국사능력검정시험 요약노트를 인스타그램 카드뉴스(1080x1080 인포그래픽)로 만들려고 합니다.

노트 제목: ${note.title}
시대: ${note.eraLabel}
관련 기출: ${note.relatedQuestionIds.length}문제

노트 내용 (일부):
${plainText}

이 내용을 ${slideCount - 2}개의 슬라이드로 나눠서 핵심 포인트를 정리해주세요.

규칙:
- 각 슬라이드마다 소제목 1개 + 핵심 포인트 3~5개
- 각 포인트는 15자 이내로 간결하게
- 시험에 자주 나오는 핵심만
- "자막", "유튜브", "강의", "영상" 단어 절대 사용 금지

JSON 형식으로 출력:
[
  { "subtitle": "소제목1", "points": ["포인트1", "포인트2", "포인트3"] },
  { "subtitle": "소제목2", "points": ["포인트1", "포인트2", "포인트3"] }
]

JSON만 출력하세요:`;

  const text = await generateText(prompt, model);
  // Parse JSON from response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return [];
  }
}

function buildTitleSlide(note: Note, colors: any) {
  return makeSlide([
    { type: 'div', props: { style: { display: 'flex', gap: '12px', marginBottom: '24px' }, children: [
      textNode(`#한능검`, { background: 'rgba(255,255,255,0.2)', borderRadius: '20px', padding: '8px 20px', fontSize: '22px', fontWeight: 700, color: 'white' }),
      textNode(`#${note.era}`, { background: 'rgba(255,255,255,0.2)', borderRadius: '20px', padding: '8px 20px', fontSize: '22px', fontWeight: 700, color: 'white' }),
      textNode(`#요약정리`, { background: 'rgba(255,255,255,0.2)', borderRadius: '20px', padding: '8px 20px', fontSize: '22px', fontWeight: 700, color: 'white' }),
    ]}},
    { type: 'div', props: { style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }, children: [
      textNode(note.eraLabel, { fontSize: '24px', color: 'rgba(255,255,255,0.7)', marginBottom: '16px' }),
      textNode(note.title, { fontSize: '48px', fontWeight: 800, color: 'white', textAlign: 'center', lineHeight: '1.3', marginBottom: '24px' }),
      textNode(`핵심 요약 · 저장 필수!`, { fontSize: '24px', color: 'rgba(255,255,255,0.8)' }),
    ]}},
    { type: 'div', props: { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }, children: [
      textNode(`관련 기출 ${note.relatedQuestionIds.length}문제`, { fontSize: '18px', color: 'rgba(255,255,255,0.5)' }),
      textNode('기출노트 한능검', { fontSize: '18px', color: 'rgba(255,255,255,0.5)' }),
    ]}},
  ], colors);
}

function buildContentSlide(subtitle: string, points: string[], slideNum: number, totalSlides: number, colors: any) {
  const pointElements = points.map((p, i) => ({
    type: 'div',
    props: {
      style: {
        display: 'flex', alignItems: 'flex-start', gap: '16px',
        background: 'rgba(255,255,255,0.1)', borderRadius: '14px',
        padding: '16px 20px', marginBottom: '10px',
      },
      children: [
        textNode(`${i + 1}`, { fontSize: '20px', fontWeight: 800, color: 'rgba(255,255,255,0.5)', width: '28px', textAlign: 'center' }),
        textNode(p, { fontSize: '26px', fontWeight: 600, color: 'white', lineHeight: '1.5', flex: 1 }),
      ],
    },
  }));

  return makeSlide([
    { type: 'div', props: { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }, children: [
      textNode(subtitle, { fontSize: '36px', fontWeight: 800, color: 'white' }),
      textNode(`${slideNum}/${totalSlides}`, { fontSize: '18px', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '4px 12px' }),
    ]}},
    { type: 'div', props: { style: { display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }, children: pointElements } },
    textNode('기출노트 한능검', { fontSize: '18px', color: 'rgba(255,255,255,0.4)', textAlign: 'right' }),
  ], colors);
}

function buildCtaSlide(ctaUrl: string, note: Note, colors: any) {
  return makeSlide([
    { type: 'div', props: { style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }, children: [
      textNode('📚', { fontSize: '64px', marginBottom: '24px' }),
      textNode(`${note.title}\n전체 내용이 궁금하다면?`, { fontSize: '32px', fontWeight: 800, color: 'white', textAlign: 'center', lineHeight: '1.4', marginBottom: '32px' }),
      { type: 'div', props: { style: { background: 'rgba(255,255,255,0.2)', borderRadius: '16px', padding: '20px 40px' }, children: [
        textNode(ctaUrl, { fontSize: '28px', fontWeight: 700, color: 'white' }),
      ]}},
      textNode(`87개 요약노트 · 1,900+ 기출문제 · 무료`, { fontSize: '20px', color: 'rgba(255,255,255,0.7)', marginTop: '24px' }),
    ]}},
    textNode('기출노트 한능검', { fontSize: '18px', color: 'rgba(255,255,255,0.4)', textAlign: 'right' }),
  ], colors);
}

export async function generateNoteCardNews(req: NoteCardRequest, onProgress?: (msg: string) => void): Promise<NoteSlideResult[]> {
  if (!req.noteIds.length) throw new AppError(400, '노트를 선택해주세요.');

  const font = await getFont();
  const results: NoteSlideResult[] = [];
  const slideCount = req.slideCount || 5;
  const ctaUrl = req.ctaUrl || 'gcnote.co.kr';

  for (let i = 0; i < req.noteIds.length; i++) {
    const note = getNoteById(req.noteIds[i]);
    if (!note) continue;

    const colors = ERA_COLORS[note.era] || ERA_COLORS['고려'];

    onProgress?.(`[${i + 1}/${req.noteIds.length}] "${note.title}" — AI 요약 중...`);
    const contentSlides = await generateNoteSummarySlides(note, slideCount, req.model);

    onProgress?.(`[${i + 1}/${req.noteIds.length}] 슬라이드 렌더링 중...`);

    const slideNodes: any[] = [buildTitleSlide(note, colors)];

    for (let j = 0; j < contentSlides.length; j++) {
      const cs = contentSlides[j] as any;
      if (cs.subtitle && cs.points) {
        slideNodes.push(buildContentSlide(cs.subtitle, cs.points, j + 2, slideCount, colors));
      }
    }

    slideNodes.push(buildCtaSlide(ctaUrl, note, colors));

    const pngs: Buffer[] = [];
    for (const node of slideNodes) {
      const svg = await satori(node as any, {
        width: 1080, height: 1080,
        fonts: [{ name: 'NotoSansKR', data: font, weight: 400, style: 'normal' }],
      });
      pngs.push(await renderSvgToPng(svg));
    }

    results.push({ noteId: note.id, title: note.title, era: note.era, slides: pngs });
    onProgress?.(`[${i + 1}/${req.noteIds.length}] "${note.title}" 완료!`);
  }

  return results;
}
