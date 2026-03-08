import { generateText, generateTextWithPdf, parseJSON } from './gemini.provider.js';

interface ParsedQuestion {
  content: string;
  passage?: string;
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
2. "content": 문제 본문 (질문 부분)
3. "passage": 사료/지문이 있으면 별도 분리. 없으면 생략.
4. "choices": 5개 선지 배열. 선지가 4개면 마지막에 빈 문자열 추가. ①②③④⑤ 기호는 제거하고 텍스트만.
5. "correctAnswer": 정답 번호 (1~5). PDF에서 정답을 확인할 수 없으면 1로 설정.
6. "points": 배점. PDF에서 확인 가능하면 해당 값, 아니면 2.
7. "era": 시대 분류. 다음 중 하나: "선사·고조선", "삼국", "남북국", "고려", "조선 전기", "조선 후기", "근대", "현대"
   - 문제 내용을 분석하여 가장 적절한 시대를 판단
8. "category": 분야 분류. 다음 중 하나: "정치", "경제", "사회", "문화"
   - 문제 내용을 분석하여 가장 적절한 분야를 판단
9. "difficulty": 난이도. 1(기초), 2(중급), 3(심화). 문제 복잡도에 따라 판단.

[유의사항]
- 문제 번호, 페이지 번호 등 메타정보는 제외
- 선지에서 ①②③④⑤ 같은 번호 기호 제거
- 문제가 불완전하더라도 최대한 추출
- 이미지 설명(그림, 사진 등)이 텍스트로 표현된 경우 passage에 포함

JSON 배열로만 응답하세요 (설명 없이):
[
  {
    "content": "문제 본문",
    "passage": "사료/지문 (선택)",
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
2. "content": 문제 본문 (질문 부분)
3. "passage": 사료/지문이 있으면 별도 분리. 없으면 생략.
4. "choices": 5개 선지 배열. 선지가 4개면 마지막에 빈 문자열 추가. ①②③④⑤ 기호는 제거하고 텍스트만.
5. "correctAnswer": 정답 번호 (1~5). PDF에서 정답을 확인할 수 없으면 1로 설정.
6. "points": 배점. PDF에서 확인 가능하면 해당 값, 아니면 2.
7. "era": 시대 분류. 다음 중 하나: "선사·고조선", "삼국", "남북국", "고려", "조선 전기", "조선 후기", "근대", "현대"
8. "category": 분야 분류. 다음 중 하나: "정치", "경제", "사회", "문화"
9. "difficulty": 난이도. 1(기초), 2(중급), 3(심화).

[유의사항]
- 문제 번호, 페이지 번호 등 메타정보는 제외
- 선지에서 ①②③④⑤ 같은 번호 기호 제거
- 이미지 속 그림/사진/자료는 텍스트로 묘사하여 passage에 포함
- 문제가 불완전하더라도 최대한 추출

JSON 배열로만 응답하세요 (설명 없이):`;

export const PdfImportService = {
  async parse(pdfBuffer: Buffer, model?: string): Promise<ParsedQuestion[]> {
    // Step 1: Try text extraction
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: pdfBuffer });
    await parser.load();
    const result = await parser.getText();
    const text = result.text;

    // Strip page separators to check for real content
    const stripped = text?.replace(/--\s*\d+\s*of\s*\d+\s*--/g, '').trim() ?? '';
    const hasText = stripped.length >= 50;

    console.log('[PDF] Extracted text length:', text?.length ?? 0, '| Real content:', stripped.length, '| hasText:', hasText);

    if (hasText) {
      // Text-based PDF: use text extraction path
      console.log('[PDF] Using text extraction path');
      const maxChars = 30000;
      const truncated = text.length > maxChars ? text.slice(0, maxChars) + '\n\n[...텍스트가 너무 길어 잘림...]' : text;
      const prompt = buildParsePrompt(truncated);
      const raw = await generateText(prompt, model);
      console.log('[PDF] Gemini response length:', raw.length);
      const questions = parseJSON<ParsedQuestion[]>(raw, 'PDF 문제 파싱 실패');
      console.log('[PDF] Parsed questions count:', questions.length);
      return questions;
    }

    // Step 2: Image/scanned PDF — send PDF directly to Gemini vision
    console.log('[PDF] Using vision fallback (image/scanned PDF)');
    const raw = await generateTextWithPdf(pdfBuffer, VISION_PROMPT, model);
    console.log('[PDF] Vision response length:', raw.length);
    const questions = parseJSON<ParsedQuestion[]>(raw, 'PDF 문제 파싱 실패');
    console.log('[PDF] Vision parsed questions count:', questions.length);
    return questions;
  },
};
