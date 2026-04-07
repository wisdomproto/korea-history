import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenAI } from '@google/genai';
import { config } from '../config.js';
import { AppError } from '../middleware.js';

// Text generation models
export const TEXT_MODELS = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (빠름)', default: true },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (고품질)' },
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash (최신)' },
  { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (최신 고품질)' },
];

// Image generation models
export const IMAGE_MODELS = [
  { id: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image' },
  { id: 'gemini-3.1-flash-image-preview', label: 'Gemini 3.1 Flash Image (최신)', default: true },
  { id: 'gemini-3-pro-image-preview', label: 'Gemini 3 Pro Image (최고품질)' },
  { id: 'imagen-4.0-fast-generate-001', label: 'Imagen 4 Fast (초고속)' },
  { id: 'imagen-4.0-generate-001', label: 'Imagen 4 (고품질 2K)' },
  { id: 'imagen-4.0-ultra-generate-001', label: 'Imagen 4 Ultra (최고품질 2K)' },
];

// --- Old SDK (text generation) ---
let _genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!config.gemini.apiKey) {
    throw new AppError(500, 'GEMINI_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.');
  }
  if (!_genAI) _genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  return _genAI;
}

export async function generateText(prompt: string, model?: string): Promise<string> {
  const modelId = model ?? config.gemini.model;
  const genModel = getGenAI().getGenerativeModel({ model: modelId });

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await genModel.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRetryable = msg.includes('503') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
      if (!isRetryable || attempt === 3) {
        throw new AppError(500, `Gemini 호출 실패: ${msg}`);
      }
      const delay = 1000 * Math.pow(2, attempt - 1) + Math.random() * 500;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new AppError(500, 'Gemini 호출에 실패했습니다.');
}

export async function generateTextWithPdf(pdfBuffer: Buffer, prompt: string, model?: string): Promise<string> {
  const modelId = model ?? config.gemini.model;
  const genModel = getGenAI().getGenerativeModel({ model: modelId });
  const base64 = pdfBuffer.toString('base64');

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await genModel.generateContent([
        { inlineData: { mimeType: 'application/pdf', data: base64 } },
        { text: prompt },
      ]);
      return result.response.text();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRetryable = msg.includes('503') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
      if (!isRetryable || attempt === 3) {
        throw new AppError(500, `Gemini PDF 분석 실패: ${msg}`);
      }
      const delay = 1000 * Math.pow(2, attempt - 1) + Math.random() * 500;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new AppError(500, 'Gemini PDF 분석에 실패했습니다.');
}

// --- New SDK (image generation) ---
let _genAI2: GoogleGenAI | null = null;

function getGenAI2(): GoogleGenAI {
  if (!config.gemini.apiKey) {
    throw new AppError(500, 'GEMINI_API_KEY가 설정되지 않았습니다. .env 파일을 확인하세요.');
  }
  if (!_genAI2) _genAI2 = new GoogleGenAI({ apiKey: config.gemini.apiKey });
  return _genAI2;
}

const IMAGE_SYSTEM_INSTRUCTION = `ABSOLUTE RULE: DO NOT render ANY text, letters, words, numbers, characters, or writing of any kind in the generated image. The image must contain ZERO text — no titles, no labels, no signs, no captions, no watermarks, no logos, no signatures, no annotations. Generate a purely visual illustration with no textual elements whatsoever.`;

export async function generateImage(prompt: string, model?: string, aspectRatio?: string): Promise<Buffer> {
  const modelId = model ?? 'gemini-2.5-flash-image';
  const ai = getGenAI2();

  // Imagen 모델은 별도 API
  if (modelId.startsWith('imagen-')) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await ai.models.generateImages({
          model: modelId,
          prompt,
          config: {
            numberOfImages: 1,
            ...(aspectRatio ? { aspectRatio } : {}),
          },
        });
        const imageData = (result as any).generatedImages?.[0]?.image?.imageBytes;
        if (!imageData) throw new Error('Imagen 이미지 생성 실패: 빈 응답');
        return Buffer.from(imageData, 'base64');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const isRetryable = msg.includes('503') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
        if (!isRetryable || attempt === 3) throw new AppError(500, `이미지 생성 실패: ${msg}`);
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1) + Math.random() * 500));
      }
    }
    throw new AppError(500, '이미지 생성에 실패했습니다.');
  }

  // Gemini 멀티모달 이미지 모델
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const fullPrompt = `${IMAGE_SYSTEM_INSTRUCTION}\n\n${prompt}`;
      const response = await ai.models.generateContent({
        model: modelId,
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        config: {
          responseModalities: ['IMAGE', 'TEXT'],
          ...(aspectRatio ? { imageConfig: { aspectRatio } } : {}),
        },
      });

      const candidate = response.candidates?.[0];
      const imagePart = candidate?.content?.parts?.find((p: any) => p.inlineData);
      if (!imagePart?.inlineData?.data) {
        const textPart = candidate?.content?.parts?.find((p: any) => p.text)?.text;
        throw new Error(textPart || '이미지가 생성되지 않았습니다.');
      }
      return Buffer.from(imagePart.inlineData.data, 'base64');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRetryable = msg.includes('503') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
      if (!isRetryable || attempt === 3) {
        throw new AppError(500, `이미지 생성 실패: ${msg}`);
      }
      const delay = 1000 * Math.pow(2, attempt - 1) + Math.random() * 500;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new AppError(500, '이미지 생성에 실패했습니다.');
}

export function parseJSON<T>(raw: string, errorMsg: string): T {
  // Try multiple extraction strategies
  const strategies = [
    // 1. ```json ... ``` code block (greedy — last ``` wins)
    () => {
      const m = raw.match(/```json\s*\r?\n?([\s\S]*?)```/);
      return m?.[1]?.trim();
    },
    // 2. Top-level JSON array
    () => {
      const m = raw.match(/(\[[\s\S]*\])/);
      return m?.[1];
    },
    // 3. Top-level JSON object
    () => {
      const m = raw.match(/(\{[\s\S]*\})/);
      return m?.[1];
    },
    // 4. Raw response as-is
    () => raw.trim(),
  ];

  for (const extract of strategies) {
    const json = extract();
    if (!json) continue;
    try {
      return JSON.parse(json) as T;
    } catch {
      // Try to repair truncated JSON (Gemini output token limit)
      const repaired = tryRepairTruncatedJson(json);
      if (repaired) {
        try {
          return JSON.parse(repaired) as T;
        } catch { /* continue to next strategy */ }
      }
    }
  }

  // All strategies failed — log for debugging
  console.error(`[parseJSON] ${errorMsg}`);
  console.error(`[parseJSON] Raw response (first 500 chars):`, raw.slice(0, 500));
  console.error(`[parseJSON] Raw response (last 300 chars):`, raw.slice(-300));
  throw new AppError(500, `${errorMsg}: JSON 파싱 실패`);
}

/** Try to repair JSON truncated by output token limit */
function tryRepairTruncatedJson(json: string): string | null {
  // If it looks like a truncated array, close open braces/brackets
  if (!json.startsWith('[')) return null;

  let s = json.trimEnd();
  // Remove trailing comma or incomplete value
  s = s.replace(/,\s*$/, '');
  // Remove last incomplete object (no closing brace)
  const lastBrace = s.lastIndexOf('}');
  if (lastBrace > 0) {
    s = s.slice(0, lastBrace + 1);
  }
  // Close the array if needed
  if (!s.endsWith(']')) {
    s += ']';
  }

  return s;
}
