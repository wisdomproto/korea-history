import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';
import { generateText } from './gemini.provider.js';
import { AppError } from '../middleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load a font for satori (system font fallback)
let fontData: ArrayBuffer | null = null;

async function getFont(): Promise<ArrayBuffer> {
  if (fontData) return fontData;
  // Try common system fonts
  const candidates = [
    'C:/Windows/Fonts/malgun.ttf',         // Windows - Malgun Gothic
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
  // Fallback: download Noto Sans KR from Google Fonts
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

interface QuestionData {
  examNumber: number;
  questionNumber: number;
  content: string;
  choices: string[];
  correctAnswer: number;
  era: string;
  category: string;
  points: number;
  keywords?: string[];
  explanation?: string;
}

interface CardNewsRequest {
  questions: QuestionData[];
  ctaText?: string;
  ctaUrl?: string;
  useAiExplanation?: boolean;
  model?: string;
}

interface SlideResult {
  questionNumber: number;
  examNumber: number;
  slides: Buffer[]; // 4 PNGs
}

async function renderSvgToPng(svg: string): Promise<Buffer> {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1080 },
  });
  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
}

function makeSlide(elements: any, colors: { bg1: string; bg2: string }) {
  return {
    type: 'div',
    props: {
      style: {
        width: '1080px',
        height: '1080px',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(135deg, ${colors.bg1} 0%, ${colors.bg2} 100%)`,
        fontFamily: 'NotoSansKR',
        padding: '60px',
        position: 'relative',
      },
      children: elements,
    },
  };
}

function textNode(text: string, style: any) {
  return { type: 'div', props: { style, children: text } };
}

function buildSlide1(q: QuestionData, hookText: string, colors: any) {
  return makeSlide([
    // Tags
    { type: 'div', props: { style: { display: 'flex', gap: '12px', marginBottom: '40px' }, children: [
      textNode(`#한능검`, { background: 'rgba(255,255,255,0.2)', borderRadius: '20px', padding: '8px 20px', fontSize: '22px', fontWeight: 700, color: 'white' }),
      textNode(`#${q.era}`, { background: 'rgba(255,255,255,0.2)', borderRadius: '20px', padding: '8px 20px', fontSize: '22px', fontWeight: 700, color: 'white' }),
    ]}},
    // Hook text
    textNode(hookText, { fontSize: '52px', fontWeight: 800, color: 'white', textAlign: 'center', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }),
    // Bottom info
    { type: 'div', props: { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }, children: [
      textNode(`제${q.examNumber}회 ${q.questionNumber}번`, { fontSize: '22px', color: 'rgba(255,255,255,0.7)' }),
      textNode('기출노트 한능검', { fontSize: '20px', color: 'rgba(255,255,255,0.5)' }),
    ]}},
  ], colors);
}

function buildSlide2(q: QuestionData, colors: any) {
  const contentText = q.content.length > 80 ? q.content.slice(0, 80) + '...' : q.content;
  const choiceElements = q.choices.map((c, i) => {
    const num = ['①', '②', '③', '④', '⑤'][i];
    const choiceText = c.length > 40 ? c.slice(0, 40) + '...' : c;
    return textNode(`${num} ${choiceText}`, {
      fontSize: '26px',
      color: 'white',
      padding: '14px 20px',
      background: 'rgba(255,255,255,0.1)',
      borderRadius: '12px',
      marginBottom: '8px',
    });
  });

  return makeSlide([
    textNode('Q.', { fontSize: '36px', fontWeight: 800, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }),
    textNode(contentText, { fontSize: '28px', fontWeight: 700, color: 'white', marginBottom: '32px', lineHeight: '1.5' }),
    { type: 'div', props: { style: { display: 'flex', flexDirection: 'column', flex: 1 }, children: choiceElements } },
    textNode('댓글에 정답 남겨보세요!', { fontSize: '20px', color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: '16px' }),
  ], colors);
}

function buildSlide3(q: QuestionData, explanation: string, colors: any) {
  const num = ['①', '②', '③', '④', '⑤'][q.correctAnswer - 1];
  const answerText = q.choices[q.correctAnswer - 1];
  const shortAnswer = answerText.length > 30 ? answerText.slice(0, 30) + '...' : answerText;
  const shortExpl = explanation.length > 200 ? explanation.slice(0, 200) + '...' : explanation;

  return makeSlide([
    textNode(`정답: ${num}`, { fontSize: '44px', fontWeight: 800, color: 'white', marginBottom: '8px' }),
    textNode(shortAnswer, { fontSize: '28px', color: 'rgba(255,255,255,0.85)', marginBottom: '40px' }),
    { type: 'div', props: { style: { background: 'rgba(255,255,255,0.15)', borderRadius: '20px', padding: '32px', flex: 1, display: 'flex', flexDirection: 'column' }, children: [
      textNode('해설', { fontSize: '20px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: '12px' }),
      textNode(shortExpl, { fontSize: '24px', color: 'white', lineHeight: '1.6' }),
    ]}},
    textNode('기출노트 한능검', { fontSize: '20px', color: 'rgba(255,255,255,0.5)', textAlign: 'right', marginTop: '16px' }),
  ], colors);
}

function buildSlide4(ctaText: string, ctaUrl: string, colors: any) {
  // Split ctaText by newlines into separate textNodes
  const ctaLines = ctaText.split('\n').filter(Boolean);
  const ctaElements = ctaLines.map((line) =>
    textNode(line, { fontSize: '36px', fontWeight: 800, color: 'white', textAlign: 'center', lineHeight: '1.4' })
  );

  return makeSlide([
    { type: 'div', props: { style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }, children: [
      textNode('📲', { fontSize: '64px', marginBottom: '24px' }),
      { type: 'div', props: { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }, children: ctaElements } },
      { type: 'div', props: { style: { background: 'rgba(255,255,255,0.2)', borderRadius: '16px', padding: '20px 40px', display: 'flex' }, children: [
        textNode(ctaUrl, { fontSize: '28px', fontWeight: 700, color: 'white' }),
      ]}},
      textNode('1,900+ 기출문제 · 87개 요약노트 · 무료', { fontSize: '20px', color: 'rgba(255,255,255,0.7)', marginTop: '24px' }),
    ]}},
    textNode('기출노트 한능검', { fontSize: '20px', color: 'rgba(255,255,255,0.5)', textAlign: 'right' }),
  ], colors);
}

async function generateHookText(q: QuestionData, model?: string): Promise<string> {
  try {
    const context = q.explanation
      ? `기존 해설: ${q.explanation}`
      : `보기: ${q.choices.join(' / ')}`;

    const prompt = `한국사능력검정시험 기출문제를 인스타그램 카드뉴스로 만들려고 합니다.
아래 문제의 후킹 문구를 1줄로 작성해주세요. MZ세대가 관심을 가질 만한 도발적이고 재미있는 문구여야 합니다.

시대: ${q.era}
유형: ${q.category}
문제 제목: ${q.content}
정답: ${q.choices[q.correctAnswer - 1]}
${context}

규칙:
- 20자 이내
- 이모지 1개 포함
- 질문형 또는 도발형
- 예시: "🔥 이거 맞히면 1급!", "😤 정답률 23%의 함정", "💡 5초 안에 풀 수 있나요?"

후킹 문구만 출력하세요:`;

    const text = await generateText(prompt, model);
    return text.trim().replace(/^["']|["']$/g, '');
  } catch (err) {
    console.error('[CardNews] Hook text generation failed, using fallback:', err);
    return `🔥 이 문제 맞히면 ${q.era} 마스터!`;
  }
}

async function generateCardExplanation(q: QuestionData, model?: string): Promise<string> {
  // 기존 해설이 있으면 먼저 그걸 짧게 잘라서 사용 (AI 없이도 동작)
  const fallback = q.explanation
    ? q.explanation.slice(0, 150) + (q.explanation.length > 150 ? '...' : '')
    : `정답은 ${q.correctAnswer}번 ${q.choices[q.correctAnswer - 1]}입니다.`;

  try {
    if (!q.explanation) {
      const prompt = `한국사능력검정시험 기출문제의 해설을 인스타그램 카드뉴스용으로 작성해주세요.

문제 제목: ${q.content}
보기: ${q.choices.map((c, i) => `${i + 1}. ${c}`).join(' / ')}
정답: ${q.correctAnswer}번 (${q.choices[q.correctAnswer - 1]})
시대: ${q.era}

규칙:
- 3~4문장으로 간결하게
- 핵심 사실만 포함

해설만 출력하세요:`;
      return (await generateText(prompt, model)).trim();
    }

    const prompt = `아래 한국사능력검정시험 해설을 인스타그램 카드뉴스 슬라이드에 넣을 수 있도록 짧게 요약해주세요.

원본 해설:
${q.explanation}

규칙:
- 3~4문장, 150자 이내
- 핵심 사실과 정답 이유만

요약 해설만 출력하세요:`;
    return (await generateText(prompt, model)).trim();
  } catch (err) {
    console.error('[CardNews] Explanation generation failed, using fallback:', err);
    return fallback;
  }
}

export async function generateCardNews(req: CardNewsRequest, onProgress?: (msg: string) => void): Promise<SlideResult[]> {
  if (!req.questions.length) throw new AppError(400, '문제를 선택해주세요.');

  const font = await getFont();
  const results: SlideResult[] = [];
  const ctaText = req.ctaText || '더 많은 기출문제를\n풀어보고 싶다면?';
  const ctaUrl = req.ctaUrl || 'gcnote.co.kr';

  for (let i = 0; i < req.questions.length; i++) {
    const q = req.questions[i];
    const colors = ERA_COLORS[q.era] || ERA_COLORS['고려'];

    onProgress?.(`[${i + 1}/${req.questions.length}] 제${q.examNumber}회 ${q.questionNumber}번 — 후킹 문구 생성 중...`);

    // Generate hook text
    const hookText = await generateHookText(q, req.model);

    // Generate card-news explanation (always AI-summarized from existing explanation)
    onProgress?.(`[${i + 1}/${req.questions.length}] 카드뉴스 해설 생성 중...`);
    const explanation = await generateCardExplanation(q, req.model);

    onProgress?.(`[${i + 1}/${req.questions.length}] 슬라이드 렌더링 중...`);

    const slides: Buffer[] = [];
    const slideNames = ['hook', 'question', 'answer', 'cta'];
    const slideNodes = [
      buildSlide1(q, hookText, colors),
      buildSlide2(q, colors),
      buildSlide3(q, explanation, colors),
      buildSlide4(ctaText, ctaUrl, colors),
    ];

    for (let si = 0; si < slideNodes.length; si++) {
      try {
        const svg = await satori(slideNodes[si] as any, {
          width: 1080,
          height: 1080,
          fonts: [{ name: 'NotoSansKR', data: font, weight: 400, style: 'normal' }],
        });
        const png = await renderSvgToPng(svg);
        slides.push(png);
      } catch (err: any) {
        console.error(`[CardNews] Slide ${slideNames[si]} render failed:`, err.message);
        console.error(`[CardNews] hookText="${hookText}", explanation="${explanation?.slice(0, 50)}..."`);
        throw err;
      }
    }

    results.push({
      questionNumber: q.questionNumber,
      examNumber: q.examNumber,
      slides,
    });

    onProgress?.(`[${i + 1}/${req.questions.length}] 완료!`);
  }

  return results;
}

export function getAvailableExams(): { examNumber: number; questionCount: number }[] {
  const dataDir = config.dataDir;
  const orderPath = path.join(dataDir, 'exam-order.json');
  if (!fs.existsSync(orderPath)) return [];

  const order: number[] = JSON.parse(fs.readFileSync(orderPath, 'utf-8'));
  return order.map((id) => {
    const filePath = path.join(dataDir, `exam-${id}.json`);
    if (!fs.existsSync(filePath)) return null;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return { examNumber: data.exam.examNumber, questionCount: data.questions.length };
  }).filter(Boolean) as any[];
}

export function getExamQuestions(examNumber: number): QuestionData[] {
  const dataDir = config.dataDir;
  // Find exam file by examNumber
  const orderPath = path.join(dataDir, 'exam-order.json');
  if (!fs.existsSync(orderPath)) return [];

  const order: number[] = JSON.parse(fs.readFileSync(orderPath, 'utf-8'));
  for (const id of order) {
    const filePath = path.join(dataDir, `exam-${id}.json`);
    if (!fs.existsSync(filePath)) continue;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (data.exam.examNumber === examNumber) {
      return data.questions.map((q: any) => ({
        examNumber: data.exam.examNumber,
        questionNumber: q.questionNumber,
        content: q.content,
        choices: q.choices,
        correctAnswer: q.correctAnswer,
        era: q.era,
        category: q.category,
        points: q.points,
        keywords: q.keywords,
        explanation: q.explanation,
      }));
    }
  }
  return [];
}
