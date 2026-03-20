import { generateText, generateImage, IMAGE_MODELS } from './gemini.provider.js';
import { getNoteById, type Note } from './notes.service.js';
import { AppError } from '../middleware.js';

interface NoteCardRequest {
  noteIds: string[];
  slideCount?: number; // 3~5 slides (default 4)
  model?: string;      // text model for summarization
  imageModel?: string; // image model for webtoon generation
  ctaUrl?: string;
}

interface NoteSlideResult {
  noteId: string;
  title: string;
  era: string;
  slides: Buffer[]; // PNGs from Gemini
}

/** Extract plain text from HTML content. */
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

async function generateSlideContents(note: Note, slideCount: number, model?: string): Promise<{ subtitle: string; description: string }[]> {
  const plainText = stripHtml(note.content).slice(0, 3000);

  const prompt = `한국사능력검정시험 요약노트를 인스타그램 카드뉴스(웹툰 스타일 일러스트)로 만들려고 합니다.

노트 제목: ${note.title}
시대: ${note.eraLabel}

노트 내용:
${plainText}

이 내용을 ${slideCount}개의 장면으로 나눠서, 각 장면의 소제목과 핵심 내용을 한 줄로 정리해주세요.

규칙:
- 각 장면마다 소제목 1개 + 핵심 내용 1문장 (30자 이내)
- 시험에 자주 나오는 핵심만
- 시각적으로 표현할 수 있는 장면 위주
- "자막", "유튜브", "강의", "영상" 단어 절대 사용 금지

JSON 형식:
[
  { "subtitle": "소제목", "description": "핵심 내용 한 줄" }
]

JSON만 출력:`;

  const text = await generateText(prompt, model);
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return [];
  }
}

async function generateWebtoonSlide(
  note: Note,
  subtitle: string,
  description: string,
  slideNum: number,
  totalSlides: number,
  imageModel?: string,
): Promise<Buffer> {
  const prompt = `Create a 1080x1080 pixel Instagram card-news illustration in Korean webtoon (manhwa) style.

Topic: Korean History - ${note.eraLabel} - ${note.title}
Scene: ${subtitle}
Key point: ${description}

Style requirements:
- Clean, modern Korean webtoon illustration style
- Soft pastel colors, warm tones
- Historical Korean characters in traditional clothing (hanbok, armor, etc.)
- Text overlay at top: "${subtitle}" in bold white Korean text with dark shadow
- Text overlay at bottom-left: "${slideNum}/${totalSlides}" in small text
- Text overlay at bottom-right: "기출노트 한능검" watermark in small text
- NO speech bubbles, NO manga style, NO Japanese style
- Educational and clean, suitable for Instagram
- 1080x1080 square format`;

  try {
    return await generateImage(prompt, imageModel);
  } catch (err) {
    console.error(`[NoteCardNews] Image generation failed for "${subtitle}":`, err);
    throw err;
  }
}

async function generateTitleSlide(note: Note, imageModel?: string): Promise<Buffer> {
  const prompt = `Create a 1080x1080 pixel Instagram card-news title slide in Korean webtoon style.

Topic: Korean History - ${note.eraLabel}
Title: "${note.title}"

Style requirements:
- Beautiful Korean historical scene as background
- Large centered title text: "${note.title}" in bold white Korean text
- Subtitle: "${note.eraLabel}" in smaller text above the title
- Bottom text: "핵심 요약 · 저장 필수!" in small text
- Tags: "#한능검 #${note.era} #요약정리" at the top
- Soft gradient overlay for text readability
- Modern, clean Korean webtoon illustration style
- 1080x1080 square format`;

  return await generateImage(prompt, imageModel);
}

async function generateCtaSlide(note: Note, ctaUrl: string, imageModel?: string): Promise<Buffer> {
  const prompt = `Create a 1080x1080 pixel Instagram CTA (call-to-action) slide.

Style: Modern Korean educational app promotion
Content:
- Center icon: 📚 book emoji or stack of books illustration
- Main text: "${note.title}" in bold
- Sub text: "전체 내용이 궁금하다면?"
- URL box: "${ctaUrl}" in a rounded rectangle
- Bottom text: "87개 요약노트 · 1,900+ 기출문제 · 무료"
- Watermark: "기출노트 한능검"
- Soft pastel gradient background
- Clean, professional design
- 1080x1080 square format`;

  return await generateImage(prompt, ctaUrl);
}

export async function generateNoteCardNews(req: NoteCardRequest, onProgress?: (msg: string) => void): Promise<NoteSlideResult[]> {
  if (!req.noteIds.length) throw new AppError(400, '노트를 선택해주세요.');

  const results: NoteSlideResult[] = [];
  const slideCount = req.slideCount || 4;
  const ctaUrl = req.ctaUrl || 'gcnote.co.kr';
  const imageModel = req.imageModel || IMAGE_MODELS[0].id;

  for (let i = 0; i < req.noteIds.length; i++) {
    const note = getNoteById(req.noteIds[i]);
    if (!note) continue;

    // Step 1: AI summarize into scenes
    onProgress?.(`[${i + 1}/${req.noteIds.length}] "${note.title}" — AI 장면 구성 중...`);
    const scenes = await generateSlideContents(note, slideCount - 2, req.model);

    const slides: Buffer[] = [];

    // Step 2: Generate title slide
    onProgress?.(`[${i + 1}/${req.noteIds.length}] 타이틀 웹툰 생성 중...`);
    try {
      slides.push(await generateTitleSlide(note, imageModel));
    } catch (err) {
      console.error('[NoteCardNews] Title slide failed:', err);
      throw new AppError(500, `타이틀 이미지 생성 실패: ${(err as Error).message}`);
    }

    // Step 3: Generate content slides
    for (let j = 0; j < scenes.length; j++) {
      const scene = scenes[j];
      if (!scene?.subtitle) continue;
      onProgress?.(`[${i + 1}/${req.noteIds.length}] 웹툰 ${j + 2}/${slideCount} 생성 중: ${scene.subtitle}`);
      try {
        slides.push(await generateWebtoonSlide(note, scene.subtitle, scene.description, j + 2, slideCount, imageModel));
      } catch (err) {
        console.error(`[NoteCardNews] Content slide ${j + 2} failed:`, err);
        // Skip failed slides instead of crashing
        continue;
      }
    }

    // Step 4: Generate CTA slide
    onProgress?.(`[${i + 1}/${req.noteIds.length}] CTA 슬라이드 생성 중...`);
    try {
      slides.push(await generateCtaSlide(note, ctaUrl, imageModel));
    } catch (err) {
      console.error('[NoteCardNews] CTA slide failed:', err);
      // CTA is optional, continue without it
    }

    results.push({ noteId: note.id, title: note.title, era: note.era, slides });
    onProgress?.(`[${i + 1}/${req.noteIds.length}] "${note.title}" 완료! (${slides.length}장)`);
  }

  return results;
}

export { IMAGE_MODELS };
