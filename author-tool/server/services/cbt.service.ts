import { getObjectText } from './r2.service.js';
import { AppError } from '../middleware.js';

// --- Types ---

export interface CbtCategory {
  name: string;
  code: string;
  url: string;
  examCount: number;
  questionCount: number;
}

export interface CbtExamMeta {
  exam_id: string;
  label: string;
  date: string;
  question_count: number;
}

export interface CategoryManifest {
  category: CbtCategory;
  exams: CbtExamMeta[];
}

export interface CbtQuestionImage {
  url: string;
  local_path: string | null;
}

export interface CbtChoice {
  number: number;
  text: string;
  is_correct: boolean;
  images: CbtQuestionImage[] | null;
}

export interface CbtQuestion {
  question_id: string;
  number: number;
  text: string;
  images: CbtQuestionImage[] | null;
  choices: CbtChoice[];
  correct_answer: number;
  answer_rate: number | null;
  explanation: string | null;
}

export interface CbtExamData {
  exam_id: string;
  label: string;
  date: string;
  url: string;
  question_count: number;
  questions: CbtQuestion[];
}

// --- Cache (5-min TTL) ---

interface CacheEntry<T> { data: T; expiry: number; }
const cache = new Map<string, CacheEntry<any>>();
const CACHE_TTL = 5 * 60 * 1000;

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expiry) { cache.delete(key); return null; }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

export function clearCache(key: string): void {
  cache.delete(key);
}

// --- Service Functions ---

export async function listCategories(): Promise<CbtCategory[]> {
  const cacheKey = 'categories';
  const cached = getCached<CbtCategory[]>(cacheKey);
  if (cached) return cached;
  try {
    const raw = await getObjectText('cbt/' +'_categories.json');
    const categories: CbtCategory[] = JSON.parse(raw);
    setCache(cacheKey, categories);
    return categories;
  } catch (err: any) {
    if (err?.name === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404) {
      throw new AppError(404, 'CBT 카테고리 데이터를 찾을 수 없습니다. R2 버킷을 확인하세요.');
    }
    throw new AppError(500, `CBT 데이터 로드 실패: ${err.message}`);
  }
}

export async function getManifest(code: string): Promise<CategoryManifest> {
  const cacheKey = `manifest:${code}`;
  const cached = getCached<CategoryManifest>(cacheKey);
  if (cached) return cached;
  try {
    const raw = await getObjectText('cbt/' +`${code}/manifest.json`);
    const manifest: CategoryManifest = JSON.parse(raw);
    setCache(cacheKey, manifest);
    return manifest;
  } catch (err: any) {
    if (err?.name === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404) {
      throw new AppError(404, `카테고리 '${code}'를 찾을 수 없습니다.`);
    }
    throw new AppError(500, `매니페스트 로드 실패: ${err.message}`);
  }
}

export async function getExam(code: string, examId: string): Promise<CbtExamData> {
  const cacheKey = `exam:${code}:${examId}`;
  const cached = getCached<CbtExamData>(cacheKey);
  if (cached) return cached;
  try {
    const raw = await getObjectText('cbt/' +`${code}/exams/${examId}.json`);
    const exam: CbtExamData = JSON.parse(raw);
    setCache(cacheKey, exam);
    return exam;
  } catch (err: any) {
    if (err?.name === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404) {
      throw new AppError(404, `시험 '${examId}'를 찾을 수 없습니다.`);
    }
    throw new AppError(500, `시험 데이터 로드 실패: ${err.message}`);
  }
}
