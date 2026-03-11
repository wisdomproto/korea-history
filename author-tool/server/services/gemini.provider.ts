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
  { id: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image', default: true },
  { id: 'gemini-3.1-flash-image-preview', label: 'Gemini 3.1 Flash Image (최신)' },
  { id: 'gemini-3-pro-image-preview', label: 'Gemini 3 Pro Image (최고품질)' },
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

export async function generateImage(prompt: string, model?: string): Promise<Buffer> {
  const modelId = model ?? 'gemini-2.5-flash-image';
  const ai = getGenAI2();

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });

      const parts = response.candidates?.[0]?.content?.parts;
      if (!parts) throw new Error('응답에 파트가 없습니다.');

      for (const part of parts) {
        if (part.inlineData?.data) {
          return Buffer.from(part.inlineData.data, 'base64');
        }
      }
      throw new Error('이미지가 생성되지 않았습니다.');
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
