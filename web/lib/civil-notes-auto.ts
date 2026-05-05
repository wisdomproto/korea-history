/**
 * 자동 단권화 가이드 — 656 stem 자동 분류 (build-auto-civil-guides.mjs 산출물).
 * 본문 X, 단원 분류 + 키워드 + 기출문제 매칭만.
 *
 * stem 형식 변환:
 *   exam-types ref.stem = "9급-국가직-공무원-국어" (하이픈)
 *   폴더명 = "9급_국가직_공무원_국어" (언더스코어)
 *
 * 데이터 소스 (2026-05-05 R2 이관):
 *   1. R2 (production) — `${R2_PUBLIC_URL}/civil-notes-auto/{folder}/{file}.json`
 *   2. fs fallback (dev / R2 미설정 / 임시 네트워크 실패)
 *
 * 모든 함수 async — server component에서만 호출.
 */
import "server-only";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data", "civil-notes-auto");
const R2_BASE = process.env.R2_PUBLIC_URL;
const R2_PREFIX = "civil-notes-auto";
const REVALIDATE = 86400; // 1일

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

/**
 * R2 fetch 우선 (Edge cache, revalidate 1일) → fs fallback (dev / 미설정 시).
 * 404는 silent null. 다른 실패는 fs로 폴백 시도.
 */
async function readJson<T>(folder: string, file: string): Promise<T | null> {
  if (R2_BASE) {
    try {
      // 한글 폴더명은 percent-encoded URL로 fetch (R2 key는 raw UTF-8)
      const url = `${R2_BASE}/${R2_PREFIX}/${encodeURIComponent(folder)}/${file}`;
      const res = await fetch(url, { next: { revalidate: REVALIDATE } });
      if (res.ok) return (await res.json()) as T;
      if (res.status === 404) return null;
      // 5xx 등은 fs fallback 시도
    } catch {
      // network failure → fs fallback
    }
  }
  try {
    const p = path.join(DATA_DIR, folder, file);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
  } catch {
    return null;
  }
}

export async function getAutoMeta(stem: string | undefined): Promise<AutoMeta | null> {
  const folder = stemToFolder(stem);
  if (!folder) return null;
  return readJson<AutoMeta>(folder, "meta.json");
}

export async function getAutoTopics(stem: string | undefined): Promise<AutoTopic[]> {
  const folder = stemToFolder(stem);
  if (!folder) return [];
  return (await readJson<AutoTopic[]>(folder, "topics-index.json")) ?? [];
}

export async function getAutoQuestionMap(
  stem: string | undefined,
): Promise<Record<string, Record<string, AutoQuestionTopic[]>> | null> {
  const folder = stemToFolder(stem);
  if (!folder) return null;
  return readJson<Record<string, Record<string, AutoQuestionTopic[]>>>(folder, "q-map.json");
}

export async function getAutoTopicQuestions(
  stem: string | undefined,
): Promise<Record<string, AutoTopicQuestion[]> | null> {
  const folder = stemToFolder(stem);
  if (!folder) return null;
  return readJson<Record<string, AutoTopicQuestion[]>>(folder, "tq-map.json");
}

/**
 * 한 문제 → 매칭 단원 top-3 가져오기 (사전 인덱스 lookup).
 */
export async function getAutoRelatedTopicsForQuestion(
  stem: string | undefined,
  examId: string,
  questionNumber: number,
): Promise<Array<{ topicId: string; title: string; freq: number; isFallback?: boolean }>> {
  const map = await getAutoQuestionMap(stem);
  if (!map) return [];
  const examMap = map[examId];
  if (!examMap) return [];
  const entries = examMap[String(questionNumber)] || [];
  if (entries.length === 0) return [];

  const topics = await getAutoTopics(stem);
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
export async function getAutoQuestionsForTopic(
  stem: string | undefined,
  topicId: string,
  limit = 12,
): Promise<AutoTopicQuestion[]> {
  const map = await getAutoTopicQuestions(stem);
  if (!map) return [];
  return (map[topicId] ?? []).slice(0, limit);
}
