/**
 * Async data fetching layer for exam data from R2.
 *
 * Replaces the old static `data/exams.ts` with runtime fetching + in-memory cache.
 * Falls back to bundled JSON imports when R2 is not configured or unavailable.
 */
import { Exam, Question } from './types';
import * as bundledExamsModule from '../data/exams';

// R2 public URL — Expo requires EXPO_PUBLIC_ prefix for client-side env vars
// In dev, points to proxy (http://localhost:3001/r2) to bypass CORS
const R2_BASE_URL = process.env.EXPO_PUBLIC_R2_URL || '';

/** Rewrite absolute R2 URLs to go through our proxy when using proxy mode */
function rewriteUrl(url: string): string {
  if (!R2_BASE_URL || !url) return url;
  // If R2_BASE_URL is a proxy (not direct R2), rewrite absolute R2 URLs
  if (!R2_BASE_URL.includes('r2.dev') && url.includes('r2.dev')) {
    const parsed = new URL(url);
    return `${R2_BASE_URL}${parsed.pathname}`;
  }
  return url;
}

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

// ── Bundled fallback ───────────────────────────────────────
// Track whether R2 is reachable; once it fails, use bundled data for the session
let r2Failed = false;

function useBundled(): boolean {
  return !R2_BASE_URL || r2Failed;
}

// ── Public API ─────────────────────────────────────────────

/** Fetch manifest (list of all exams) */
export async function fetchExams(): Promise<Exam[]> {
  if (useBundled()) {
    return bundledExamsModule.EXAMS;
  }

  if (cachedManifest) {
    return cachedManifest.exams;
  }

  try {
    const res = await fetch(`${R2_BASE_URL}/manifest.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    cachedManifest = (await res.json()) as Manifest;
    return cachedManifest.exams;
  } catch {
    // R2 unreachable — fall back to bundled data for this session
    r2Failed = true;
    return bundledExamsModule.EXAMS;
  }
}

/** Fetch a single exam by ID */
export async function fetchExamById(examId: number): Promise<Exam | undefined> {
  const exams = await fetchExams();
  return exams.find((e) => e.id === examId);
}

/** Fetch questions for an exam */
export async function fetchQuestionsByExamId(examId: number): Promise<Question[]> {
  if (useBundled()) {
    return bundledExamsModule.getQuestionsByExamId(examId);
  }

  // Check cache
  const cached = examCache.get(examId);
  if (cached) return cached.questions;

  // Find URL from manifest
  if (!cachedManifest) await fetchExams();
  if (useBundled()) return bundledExamsModule.getQuestionsByExamId(examId);

  const entry = cachedManifest!.exams.find((e) => e.id === examId);
  if (!entry) return [];

  try {
    const res = await fetch(rewriteUrl(entry.url));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as ExamFile;
    examCache.set(examId, data);
    return data.questions;
  } catch {
    r2Failed = true;
    return bundledExamsModule.getQuestionsByExamId(examId);
  }
}

/** Fetch a single question by ID (searches all exams) */
export async function fetchQuestionById(questionId: number): Promise<Question | undefined> {
  if (useBundled()) {
    return bundledExamsModule.getQuestionById(questionId);
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
  if (useBundled()) {
    return bundledExamsModule.getAllQuestions();
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
  r2Failed = false;
}
