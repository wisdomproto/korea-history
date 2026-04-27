/**
 * 자동 단권화 가이드 — 730 stem 자동 분류 (build-auto-civil-guides.mjs 산출물).
 * 본문 X, 단원 분류 + 키워드 + 기출문제 매칭만.
 *
 * stem 형식 변환:
 *   exam-types ref.stem = "9급-국가직-공무원-국어" (하이픈)
 *   폴더명 = "9급_국가직_공무원_국어" (언더스코어)
 */
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data", "civil-notes-auto");

export interface AutoTopic {
  topicId: string;
  ord: number;
  title: string;
  freq: number;
  keywords: string[];
  questionCount: number;
}

export interface AutoMeta {
  stem: string;
  totalQ: number;
  totalExams: number;
  topics: number;
  matched: number;
  fallback: number;
  matchedPct: string;
  updated: string;
}

export interface AutoQuestionTopic {
  topicId: string;
  score: number;
  isFallback?: boolean;
}

export interface AutoTopicQuestion {
  examId: string;
  examLabel: string;
  questionNumber: number;
  qPreview: string;
  score: number;
}

function stemToFolder(stem: string | undefined): string | null {
  if (!stem) return null;
  return stem.replace(/-/g, "_");
}

function readJsonSafe<T>(p: string): T | null {
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

export function getAutoMeta(stem: string | undefined): AutoMeta | null {
  const folder = stemToFolder(stem);
  if (!folder) return null;
  return readJsonSafe<AutoMeta>(path.join(DATA_DIR, folder, "meta.json"));
}

export function getAutoTopics(stem: string | undefined): AutoTopic[] {
  const folder = stemToFolder(stem);
  if (!folder) return [];
  return readJsonSafe<AutoTopic[]>(path.join(DATA_DIR, folder, "topics-index.json")) ?? [];
}

const _qmapCache = new Map<string, Record<string, Record<string, AutoQuestionTopic[]>>>();
export function getAutoQuestionMap(stem: string | undefined) {
  const folder = stemToFolder(stem);
  if (!folder) return null;
  if (_qmapCache.has(folder)) return _qmapCache.get(folder)!;
  const data = readJsonSafe<Record<string, Record<string, AutoQuestionTopic[]>>>(
    path.join(DATA_DIR, folder, "q-map.json"),
  );
  if (data) _qmapCache.set(folder, data);
  return data;
}

const _tqmapCache = new Map<string, Record<string, AutoTopicQuestion[]>>();
export function getAutoTopicQuestions(stem: string | undefined): Record<string, AutoTopicQuestion[]> | null {
  const folder = stemToFolder(stem);
  if (!folder) return null;
  if (_tqmapCache.has(folder)) return _tqmapCache.get(folder)!;
  const data = readJsonSafe<Record<string, AutoTopicQuestion[]>>(
    path.join(DATA_DIR, folder, "tq-map.json"),
  );
  if (data) _tqmapCache.set(folder, data);
  return data;
}

/**
 * 한 문제 → 매칭 단원 top-3 가져오기 (사전 인덱스 lookup).
 */
export function getAutoRelatedTopicsForQuestion(
  stem: string | undefined,
  examId: string,
  questionNumber: number,
): Array<{ topicId: string; title: string; freq: number; isFallback?: boolean }> {
  const map = getAutoQuestionMap(stem);
  if (!map) return [];
  const examMap = map[examId];
  if (!examMap) return [];
  const entries = examMap[String(questionNumber)] || [];
  if (entries.length === 0) return [];

  const topics = getAutoTopics(stem);
  const byId = new Map(topics.map((t) => [t.topicId, t]));
  return entries
    .map((e) => {
      const t = byId.get(e.topicId);
      if (!t) return null;
      return {
        topicId: t.topicId,
        title: t.title,
        freq: t.freq,
        isFallback: e.isFallback,
      };
    })
    .filter(Boolean) as Array<{ topicId: string; title: string; freq: number; isFallback?: boolean }>;
}

/**
 * 단원 → 그 단원 매칭 기출문제 (역방향).
 */
export function getAutoQuestionsForTopic(
  stem: string | undefined,
  topicId: string,
  limit = 12,
): AutoTopicQuestion[] {
  const map = getAutoTopicQuestions(stem);
  if (!map) return [];
  return (map[topicId] ?? []).slice(0, limit);
}
