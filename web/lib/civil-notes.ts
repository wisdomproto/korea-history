import fs from "node:fs";
import path from "node:path";

export interface CivilNoteIndexItem {
  slug: string;
  subject: string;
  icon: string;
  subtitle: string;
  examSlug: string;
  examLabel: string;
  topics: number;
  keywords: number;
  chars: number;
  updated: string;
}

export interface CivilNoteFull extends Omit<CivilNoteIndexItem, "topics" | "keywords"> {
  topics: string[];
  keywords: string[];
  style: string;
  body: string;
}

const DATA_DIR = path.join(process.cwd(), "data", "civil-notes");

let cachedIndex: CivilNoteIndexItem[] | null = null;

export function getCivilNoteIndex(): CivilNoteIndexItem[] {
  if (cachedIndex) return cachedIndex;
  const indexPath = path.join(DATA_DIR, "index.json");
  if (!fs.existsSync(indexPath)) return [];
  cachedIndex = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
  return cachedIndex!;
}

export function getCivilNote(slug: string): CivilNoteFull | null {
  const filePath = path.join(DATA_DIR, `${slug}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

export function getAllCivilNoteSlugs(): string[] {
  return getCivilNoteIndex().map((n) => n.slug);
}

// === 단원 (Topic) 단위 ===

export interface CivilTopicIndexItem {
  topicId: string;
  ord: number;
  title: string;
  keywords: string[];
  freq: number;
  chars: number;
}

export interface CivilTopicFull extends CivilTopicIndexItem {
  noteSlug: string;
  noteSubject: string;
  html: string;
  style: string;
}

export interface CivilAllTopicEntry {
  noteSlug: string;
  noteSubject: string;
  topicId: string;
  title: string;
  keywords: string[];
  freq: number;
}

export function getNoteTopicsIndex(noteSlug: string): CivilTopicIndexItem[] {
  const p = path.join(DATA_DIR, noteSlug, "topics-index.json");
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

export function getCivilTopic(noteSlug: string, topicId: string): CivilTopicFull | null {
  const p = path.join(DATA_DIR, noteSlug, "topics", `${topicId}.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

export function getAllTopicParams(): Array<{ slug: string; topicId: string }> {
  const result: Array<{ slug: string; topicId: string }> = [];
  for (const note of getCivilNoteIndex()) {
    for (const t of getNoteTopicsIndex(note.slug)) {
      result.push({ slug: note.slug, topicId: t.topicId });
    }
  }
  return result;
}

let cachedAllTopics: CivilAllTopicEntry[] | null = null;
export function getAllTopicsIndex(): CivilAllTopicEntry[] {
  if (cachedAllTopics) return cachedAllTopics;
  const p = path.join(DATA_DIR, "all-topics-index.json");
  if (!fs.existsSync(p)) return [];
  cachedAllTopics = JSON.parse(fs.readFileSync(p, "utf-8"));
  return cachedAllTopics!;
}

// === ExamType / Subject ↔ 노트 매핑 ===

/**
 * Subject label → 우리 13개 노트 slug 매핑.
 * Subject label/slug 양쪽 모두 매칭. 형법/형법총론, 형사소송법/형사소송법개론 등 alias 처리.
 */
const SUBJECT_TO_NOTE: Record<string, string> = {
  // 정확 라벨
  "행정법총론": "admin-law",
  "행정학개론": "admin-pa",
  "형법총론": "criminal-law",
  "형사소송법개론": "criminal-procedure",
  "회계학": "accounting",
  "세법개론": "tax-law",
  "교정학개론": "corrections",
  "사회복지학개론": "social-welfare",
  "교육학개론": "education",
  "국제법개론": "international-law",
  "관세법개론": "customs-law",
  "국어": "korean",
  "영어": "english",
  "헌법": "constitution",
  // 자격증 (Subject label = 시험명)
  "정보처리기사": "engineer-info-processing",
  "정보처리기사(구)": "engineer-info-processing",
  "산업안전기사": "industrial-safety-engineer",
  "공인중개사 1차": "realtor-1",
  "공인중개사 2차": "realtor-2",
  "컴퓨터활용능력 1급": "computer-skills-1",
  "1급": "accounting-cert-1",
  "전기기사": "electrical-engineer",
  "사회조사분석사 2급": "social-research-2",
  "직업상담사 2급": "career-counselor-2",
  // alias (Subject label 변형)
  "행정법": "admin-law",
  "행정학": "admin-pa",
  "형법": "criminal-law",
  "형사소송법": "criminal-procedure",
};

export function getNoteForSubjectLabel(label: string | undefined): CivilNoteIndexItem | null {
  if (!label) return null;
  const slug = SUBJECT_TO_NOTE[label.trim()];
  if (!slug) return null;
  return getCivilNoteIndex().find((n) => n.slug === slug) ?? null;
}

/**
 * 한 ExamType에 매칭되는 우리 단권화 노트 리스트 반환.
 * subjects는 lib/exam-types.ts의 Subject[] (label만 사용).
 */
export function getNotesForSubjects(subjectLabels: string[]): CivilNoteIndexItem[] {
  const slugs = new Set<string>();
  for (const label of subjectLabels) {
    const slug = SUBJECT_TO_NOTE[label?.trim()];
    if (slug) slugs.add(slug);
  }
  const idx = getCivilNoteIndex();
  return [...slugs].map((s) => idx.find((n) => n.slug === s)).filter(Boolean) as CivilNoteIndexItem[];
}

/**
 * Subject + question text → 매칭되는 단원 N개 반환.
 * QuestionCard의 relatedNotes prop으로 직접 사용 가능한 형태.
 *
 * 매칭 점수: 단원 keywords와 question/choices text 부분문자열 교집합 수.
 * 매칭 0이어도 노트의 첫 단원(가장 빈출 또는 ord 1) fallback.
 */
export interface RelatedTopicLink {
  id: string;
  title: string;
  eraLabel: string;
  sectionId: string;
  href: string;
}

export function getRelatedTopicsForQuestion(
  subjectLabel: string | undefined,
  questionText: string,
  choicesText = "",
  limit = 3,
): RelatedTopicLink[] {
  const note = getNoteForSubjectLabel(subjectLabel);
  if (!note) return [];

  const topics = getNoteTopicsIndex(note.slug);
  if (topics.length === 0) return [];

  const haystack = `${questionText} ${choicesText}`;

  type Scored = { topic: CivilTopicIndexItem; score: number };
  const scored: Scored[] = topics
    .map((t) => ({
      topic: t,
      score: t.keywords.filter((k) => haystack.includes(k)).length,
    }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || b.topic.freq - a.topic.freq);

  // 매칭 0이면 가장 빈출 단원 fallback (전체 단원 정렬)
  let result: CivilTopicIndexItem[];
  if (scored.length === 0) {
    result = [...topics].sort((a, b) => b.freq - a.freq).slice(0, 1);
  } else {
    result = scored.slice(0, limit).map((s) => s.topic);
  }

  return result.map((t) => ({
    id: `${note.slug}-${t.topicId}`,
    title: t.title,
    eraLabel: `${note.subject}${t.freq > 0 ? ` · 출제 ${t.freq}회` : ""}`,
    sectionId: t.topicId,
    href: `/civil-notes/${note.slug}/${t.topicId}`,
  }));
}

// === 사전 매칭 인덱스 (build-question-topic-index.mjs 산출물) ===

interface QuestionTopicEntry {
  topicId: string;
  score: number;
  matched: string[];
  isFallback?: boolean;
}

interface TopicQuestionEntry {
  examId: string;
  examLabel: string;
  questionNumber: number;
  qPreview: string;
  score: number;
}

let cachedQuestionMap: Record<
  string,
  Record<string, Record<string, QuestionTopicEntry[]>>
> | null = null;

let cachedTopicQuestionsMap: Record<
  string,
  Record<string, TopicQuestionEntry[]>
> | null = null;

function loadQuestionMap() {
  if (cachedQuestionMap) return cachedQuestionMap;
  const p = path.join(DATA_DIR, "question-topic-map.json");
  if (!fs.existsSync(p)) {
    cachedQuestionMap = {};
    return cachedQuestionMap;
  }
  cachedQuestionMap = JSON.parse(fs.readFileSync(p, "utf-8"));
  return cachedQuestionMap!;
}

function loadTopicQuestionsMap() {
  if (cachedTopicQuestionsMap) return cachedTopicQuestionsMap;
  const p = path.join(DATA_DIR, "topic-questions-map.json");
  if (!fs.existsSync(p)) {
    cachedTopicQuestionsMap = {};
    return cachedTopicQuestionsMap;
  }
  cachedTopicQuestionsMap = JSON.parse(fs.readFileSync(p, "utf-8"));
  return cachedTopicQuestionsMap!;
}

/**
 * 사전 매칭 인덱스에서 (subject, examId, questionNumber) → 매칭 단원 top-3 가져오기.
 * 동적 매칭과 동일 결과지만 SSR 비용 X (단순 lookup).
 */
export function getRelatedTopicsForQuestionFromIndex(
  subjectLabel: string | undefined,
  examId: string,
  questionNumber: number,
): RelatedTopicLink[] {
  const note = getNoteForSubjectLabel(subjectLabel);
  if (!note) return [];

  const map = loadQuestionMap();
  const examMap = map[note.slug]?.[examId];
  if (!examMap) return [];

  const entries = examMap[String(questionNumber)] || [];
  if (entries.length === 0) return [];

  const topics = getNoteTopicsIndex(note.slug);
  const topicById = new Map(topics.map((t) => [t.topicId, t]));

  return entries
    .map((e) => {
      const t = topicById.get(e.topicId);
      if (!t) return null;
      return {
        id: `${note.slug}-${t.topicId}`,
        title: t.title,
        eraLabel: `${note.subject}${t.freq > 0 ? ` · 출제 ${t.freq}회` : ""}${e.isFallback ? " · 빈출 추천" : ""}`,
        sectionId: t.topicId,
        href: `/civil-notes/${note.slug}/${t.topicId}`,
      };
    })
    .filter(Boolean) as RelatedTopicLink[];
}

/**
 * 단원 → 그 단원에 매칭된 기출문제 리스트 (역방향).
 * 단원 페이지에서 "이 단원에서 출제된 기출문제" 섹션용.
 */
export interface TopicQuestionLink {
  examId: string;
  examLabel: string;
  questionNumber: number;
  qPreview: string;
  score: number;
}

export function getQuestionsForTopic(
  noteSlug: string,
  topicId: string,
  limit = 12,
): TopicQuestionLink[] {
  const map = loadTopicQuestionsMap();
  const list = map[noteSlug]?.[topicId] || [];
  // score 0 (fallback)은 제외 — 단원 페이지에서는 진짜 매칭만
  return list.filter((q) => q.score > 0).slice(0, limit);
}
