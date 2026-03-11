import { generateText, generateTextWithPdf, parseJSON } from './gemini.provider.js';
import { PdfImageService } from './pdf-image.service.js';

export type ProgressCallback = (message: string) => void;

interface ParsedQuestion {
  content: string;
  imageUrl?: string;
  choices: [string, string, string, string, string];
  correctAnswer: number;
  points: number;
  era: string;
  category: string;
  difficulty: 1 | 2 | 3;
}

function buildParsePrompt(pdfText: string): string {
  return `당신은 한국사능력검정시험 문제 분석 전문가입니다.
아래 PDF에서 추출된 텍스트를 분석하여, 한국사 시험 문제들을 구조화된 JSON으로 변환하세요.

[추출된 PDF 텍스트]
${pdfText}

[변환 규칙]
1. 각 문제를 개별 객체로 분리
2. "content": 문제 본문 (질문 부분만). 사료/지문 텍스트는 포함하지 않음.
3. "choices": 5개 선지 배열. 선지가 4개면 마지막에 빈 문자열 추가. ①②③④⑤ 기호는 제거하고 텍스트만.
4. "correctAnswer": 정답 번호 (1~5). PDF에서 정답을 확인할 수 없으면 1로 설정.
5. "points": 배점. PDF에서 확인 가능하면 해당 값, 아니면 2.
6. "era": 시대 분류. 다음 중 하나: "선사·고조선", "삼국", "남북국", "고려", "조선 전기", "조선 후기", "근대", "현대"
   - 문제 내용을 분석하여 가장 적절한 시대를 판단
7. "category": 분야 분류. 다음 중 하나: "정치", "경제", "사회", "문화"
   - 문제 내용을 분석하여 가장 적절한 분야를 판단
8. "difficulty": 난이도. 1(기초), 2(중급), 3(심화). 문제 복잡도에 따라 판단.

[유의사항]
- 문제 번호, 페이지 번호 등 메타정보는 제외
- 선지에서 ①②③④⑤ 같은 번호 기호 제거
- 문제가 불완전하더라도 최대한 추출
- 사료/지문 이미지는 별도로 추출되므로, content에는 질문 텍스트만 작성

JSON 배열로만 응답하세요 (설명 없이):
[
  {
    "content": "문제 본문",
    "choices": ["선지1", "선지2", "선지3", "선지4", "선지5"],
    "correctAnswer": 1,
    "points": 2,
    "era": "삼국",
    "category": "정치",
    "difficulty": 2
  }
]`;
}

const VISION_PROMPT = `당신은 한국사능력검정시험 문제 분석 전문가입니다.
이 PDF 이미지에서 한국사 시험 문제들을 모두 찾아 구조화된 JSON으로 변환하세요.

[변환 규칙]
1. 각 문제를 개별 객체로 분리
2. "content": 문제 본문 (질문 부분만). 사료/지문 텍스트는 포함하지 않음.
3. "choices": 5개 선지 배열. 선지가 4개면 마지막에 빈 문자열 추가. ①②③④⑤ 기호는 제거하고 텍스트만.
4. "correctAnswer": 정답 번호 (1~5). PDF에서 정답을 확인할 수 없으면 1로 설정.
5. "points": 배점. PDF에서 확인 가능하면 해당 값, 아니면 2.
6. "era": 시대 분류. 다음 중 하나: "선사·고조선", "삼국", "남북국", "고려", "조선 전기", "조선 후기", "근대", "현대"
7. "category": 분야 분류. 다음 중 하나: "정치", "경제", "사회", "문화"
8. "difficulty": 난이도. 1(기초), 2(중급), 3(심화).

[유의사항]
- 문제 번호, 페이지 번호 등 메타정보는 제외
- 선지에서 ①②③④⑤ 같은 번호 기호 제거
- 사료/지문 이미지는 별도로 추출되므로, content에는 질문 텍스트만 작성
- 문제가 불완전하더라도 최대한 추출

JSON 배열로만 응답하세요 (설명 없이):`;

// PDF parsing model — use 2.5 Flash for text extraction (3.1 Pro for images later)
const PDF_DEFAULT_MODEL = 'gemini-2.5-flash';

export const PdfImportService = {
  async parse(pdfBuffer: Buffer, model?: string, examNumber?: number, onProgress?: ProgressCallback): Promise<ParsedQuestion[]> {
    const pdfModel = model || PDF_DEFAULT_MODEL;
    console.log(`[PDF] Using model: ${pdfModel}`);

    // Image extraction temporarily disabled — 3.1 Pro quota exhausted
    // TODO: Re-enable when quota resets
    // onProgress?.('지문 이미지 추출 시작 (Gemini 3.1 Pro)...');
    // const imagePromise = examNumber
    //   ? PdfImageService.extractAndUpload(pdfBuffer, examNumber, onProgress).catch((err) => {
    //       console.error('[PDF] Image extraction failed (continuing without images):', err);
    //       return new Map<number, string>();
    //     })
    //   : Promise.resolve(new Map<number, string>());
    const imagePromise = Promise.resolve(new Map<number, string>());

    // Step 1: Try text extraction (runs in parallel with image extraction)
    onProgress?.('PDF 텍스트 추출 중...');
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: pdfBuffer });
    await parser.load();
    const result = await parser.getText();
    const text = result.text;

    // Strip page separators to check for real content
    const stripped = text?.replace(/--\s*\d+\s*of\s*\d+\s*--/g, '').trim() ?? '';
    // Check for actual Korean content (image-based PDFs only have numbers/labels)
    const koreanChars = (stripped.match(/[\uAC00-\uD7AF]/g) || []).length;
    const hasText = koreanChars >= 50;

    console.log('[PDF] Extracted text length:', text?.length ?? 0, '| Korean chars:', koreanChars, '| hasText:', hasText);

    let questions: ParsedQuestion[];

    if (hasText) {
      // Text-based PDF: use text extraction path
      onProgress?.('AI로 문제 구조 분석 중...');
      console.log('[PDF] Using text extraction path');
      const maxChars = 30000;
      const truncated = text.length > maxChars ? text.slice(0, maxChars) + '\n\n[...텍스트가 너무 길어 잘림...]' : text;
      const prompt = buildParsePrompt(truncated);
      const raw = await generateText(prompt, pdfModel);
      console.log('[PDF] Gemini response length:', raw.length);
      console.log('[PDF] Gemini response preview:', raw.slice(0, 200));
      questions = parseJSON<ParsedQuestion[]>(raw, 'PDF 문제 파싱 실패');
      onProgress?.(`문제 ${questions.length}개 추출 완료`);
      console.log('[PDF] Parsed questions count:', questions.length);
    } else {
      // Step 2: Image/scanned PDF — send PDF directly to Gemini vision
      onProgress?.('스캔 PDF 감지 — Vision AI로 분석 중...');
      console.log('[PDF] Using vision fallback (image/scanned PDF)');
      const raw = await generateTextWithPdf(pdfBuffer, VISION_PROMPT, pdfModel);
      console.log('[PDF] Vision response length:', raw.length);
      console.log('[PDF] Vision response preview:', raw.slice(0, 200));
      questions = parseJSON<ParsedQuestion[]>(raw, 'PDF 문제 파싱 실패');
      onProgress?.(`문제 ${questions.length}개 추출 완료`);
      console.log('[PDF] Vision parsed questions count:', questions.length);
    }

    // Wait for image extraction (already running in parallel)
    if (questions.length > 0) {
      onProgress?.('이미지 추출 완료 대기 중...');
      const imageMap = await imagePromise;
      if (imageMap.size > 0) {
        for (let i = 0; i < questions.length; i++) {
          const qNum = i + 1; // questions are 1-indexed
          const url = imageMap.get(qNum);
          if (url) {
            questions[i].imageUrl = url;
          }
        }
        onProgress?.(`이미지 ${imageMap.size}개 문제에 할당 완료`);
        console.log(`[PDF] Assigned ${imageMap.size} images to questions`);
      }
    }

    return questions;
  },
};
