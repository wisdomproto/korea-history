/**
 * Async data fetching layer for exam data from R2.
 *
 * Replaces the old static `data/exams.ts` with runtime fetching + in-memory cache.
 * Falls back to bundled JSON imports when R2 is not configured (dev mode).
 */
import { Exam, Question } from './types';

// R2 public URL — set this after migration, or leave empty for bundled fallback
const R2_BASE_URL = process.env.R2_PUBLIC_URL || '';

interface Manifest {
  generatedAt: string;
  exams: (Exam & { url: string })[];
}

interface ExamFile {
  exam: Exam;
  questions: Question[];
}

// ── In-memory cache ────────────────────────────────────────
let cachedManifest: Manifest | null = null;
const examCache = new Map<number, ExamFile>();
let allQuestionsCache: Question[] | null = null;

// ── Bundled fallback (dev / offline) ───────────────────────
// These are the static imports that work without R2
let bundledExams: typeof import('../data/exams') | null = null;

async function getBundledModule() {
  if (!bundledExams) {
    bundledExams = await import('../data/exams');
  }
  return bundledExams;
}

function useR2(): boolean {
  return R2_BASE_URL.length > 0;
}

// ── Public API ─────────────────────────────────────────────

/** Fetch manifest (list of all exams) */
export async function fetchExams(): Promise<Exam[]> {
  if (!useR2()) {
    const mod = await getBundledModule();
    return mod.EXAMS;
  }

  if (cachedManifest) {
    return cachedManifest.exams;
  }

  const res = await fetch(`${R2_BASE_URL}/manifest.json`);
  if (!res.ok) throw new Error(`Failed to fetch manifest: ${res.status}`);
  cachedManifest = (await res.json()) as Manifest;
  return cachedManifest.exams;
}

/** Fetch a single exam by ID */
export async function fetchExamById(examId: number): Promise<Exam | undefined> {
  const exams = await fetchExams();
  return exams.find((e) => e.id === examId);
}

/** Fetch questions for an exam */
export async function fetchQuestionsByExamId(examId: number): Promise<Question[]> {
  if (!useR2()) {
    const mod = await getBundledModule();
    return mod.getQuestionsByExamId(examId);
  }

  // Check cache
  const cached = examCache.get(examId);
  if (cached) return cached.questions;

  // Find URL from manifest
  if (!cachedManifest) await fetchExams();
  const entry = cachedManifest!.exams.find((e) => e.id === examId);
  if (!entry) return [];

  const res = await fetch(entry.url);
  if (!res.ok) return [];
  const data = (await res.json()) as ExamFile;
  examCache.set(examId, data);
  return data.questions;
}

/** Fetch a single question by ID (searches all exams) */
export async function fetchQuestionById(questionId: number): Promise<Question | undefined> {
  if (!useR2()) {
    const mod = await getBundledModule();
    return mod.getQuestionById(questionId);
  }

  // Search cached exams first
  for (const [, ef] of examCache) {
    const found = ef.questions.find((q) => q.id === questionId);
    if (found) return found;
  }

  // Load all exams
  const all = await fetchAllQuestions();
  return all.find((q) => q.id === questionId);
}

/** Fetch ALL questions across all exams */
export async function fetchAllQuestions(): Promise<Question[]> {
  if (!useR2()) {
    const mod = await getBundledModule();
    return mod.getAllQuestions();
  }

  if (allQuestionsCache) return allQuestionsCache;

  const exams = await fetchExams();
  const allQuestions: Question[] = [];

  await Promise.all(
    exams.map(async (exam) => {
      const questions = await fetchQuestionsByExamId(exam.id);
      allQuestions.push(...questions);
    }),
  );

  allQuestionsCache = allQuestions;
  return allQuestions;
}

// ── Keywords ─────────────────────────────────────────────

type KeywordsMap = Record<string, number[]>;
let keywordsCache: KeywordsMap | null = null;

/** Fetch keyword → questionId[] mapping */
export async function fetchKeywords(): Promise<KeywordsMap> {
  if (keywordsCache) return keywordsCache;
  const mod = await import('../data/questions/keywords.json');
  keywordsCache = (mod as any).default?.keywords ?? (mod as any).keywords ?? {};
  return keywordsCache!;
}

/** Get questions matching a keyword */
export async function fetchQuestionsByKeyword(keyword: string): Promise<Question[]> {
  const kw = await fetchKeywords();
  const ids = kw[keyword] || [];
  const allQ = await fetchAllQuestions();
  return allQ.filter((q) => ids.includes(q.id));
}

/** Clear all caches (e.g., on pull-to-refresh) */
export function clearExamCache(): void {
  cachedManifest = null;
  examCache.clear();
  allQuestionsCache = null;
  keywordsCache = null;
}
