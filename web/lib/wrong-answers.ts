// Client-side only — localStorage CRUD for wrong answers, scoped by (exam, subject).
//
// v3 (per-subject): keys are namespaced by (examSlug, subjectSlug).
//   wrong-answers:한능검:한국사
//   wrong-answers:9급-국가직:국어
//   wrong-answers:9급-국가직:행정법
//
// Auto-migration:
//   "wrong-answers"          (v1) → "wrong-answers:한능검:한국사"
//   "wrong-answers:한능검"    (v2) → "wrong-answers:한능검:한국사"

export interface WrongAnswer {
  questionId: number;
  examId: number;
  examNumber: number;
  questionNumber: number;
  selectedAnswer: number;
  correctAnswer: number;
  questionContent: string;
  era: string;
  category: string;
  points: number;
  createdAt: string;
  resolved: boolean;
  resolvedAt?: string;
}

const LEGACY_V1_KEY = "wrong-answers";
const KEY_PREFIX = "wrong-answers:";
const DEFAULT_EXAM_SLUG = "한능검";
const DEFAULT_SUBJECT_SLUG = "한국사";

const compoundKey = (examSlug: string, subjectSlug: string) =>
  `${KEY_PREFIX}${examSlug}:${subjectSlug}`;

const v2Key = (examSlug: string) => `${KEY_PREFIX}${examSlug}`;

/**
 * Migrate older keys to new compound format. Idempotent.
 */
function migrate(): void {
  if (typeof window === "undefined") return;

  // v1 → v3
  const v1 = localStorage.getItem(LEGACY_V1_KEY);
  if (v1) {
    const target = compoundKey(DEFAULT_EXAM_SLUG, DEFAULT_SUBJECT_SLUG);
    if (!localStorage.getItem(target)) localStorage.setItem(target, v1);
    localStorage.removeItem(LEGACY_V1_KEY);
  }

  // v2 → v3 (any key matching wrong-answers:{slug} without second colon → assume default subject)
  // Need to scan keys
  const v2Keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(KEY_PREFIX)) continue;
    const rest = k.slice(KEY_PREFIX.length);
    // v3 = "examSlug:subjectSlug" (one colon). v2 = "examSlug" (no colon).
    if (!rest.includes(":")) v2Keys.push(k);
  }
  for (const old of v2Keys) {
    const examSlug = old.slice(KEY_PREFIX.length);
    const data = localStorage.getItem(old);
    if (!data) continue;
    // Default subject: 한국사 for 한능검 + 한능검 호환 시험들. 다른 시험은 첫 진입한 과목 알 수 없으므로 default 한국사로.
    const target = compoundKey(examSlug, DEFAULT_SUBJECT_SLUG);
    if (!localStorage.getItem(target)) localStorage.setItem(target, data);
    localStorage.removeItem(old);
  }
}

export function getWrongAnswers(
  examSlug: string = DEFAULT_EXAM_SLUG,
  subjectSlug: string = DEFAULT_SUBJECT_SLUG,
): WrongAnswer[] {
  if (typeof window === "undefined") return [];
  migrate();
  try {
    const raw = localStorage.getItem(compoundKey(examSlug, subjectSlug));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveWrongAnswers(
  answers: WrongAnswer[],
  examSlug: string = DEFAULT_EXAM_SLUG,
  subjectSlug: string = DEFAULT_SUBJECT_SLUG,
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(compoundKey(examSlug, subjectSlug), JSON.stringify(answers));
}

export function addWrongAnswer(
  entry: Omit<WrongAnswer, "createdAt" | "resolved">,
  examSlug: string = DEFAULT_EXAM_SLUG,
  subjectSlug: string = DEFAULT_SUBJECT_SLUG,
): void {
  const answers = getWrongAnswers(examSlug, subjectSlug);
  const existing = answers.find((a) => a.questionId === entry.questionId);

  if (existing) {
    existing.selectedAnswer = entry.selectedAnswer;
    existing.resolved = false;
    existing.resolvedAt = undefined;
  } else {
    answers.push({
      ...entry,
      createdAt: new Date().toISOString(),
      resolved: false,
    });
  }

  saveWrongAnswers(answers, examSlug, subjectSlug);
}

export function resolveWrongAnswer(
  questionId: number,
  examSlug: string = DEFAULT_EXAM_SLUG,
  subjectSlug: string = DEFAULT_SUBJECT_SLUG,
): void {
  const answers = getWrongAnswers(examSlug, subjectSlug);
  const entry = answers.find((a) => a.questionId === questionId);
  if (entry && !entry.resolved) {
    entry.resolved = true;
    entry.resolvedAt = new Date().toISOString();
    saveWrongAnswers(answers, examSlug, subjectSlug);
  }
}

/**
 * Handle answer submission — auto-save wrong / auto-resolve.
 */
export function handleAnswerResult(
  questionId: number,
  examId: number,
  examNumber: number,
  questionNumber: number,
  selectedAnswer: number,
  correctAnswer: number,
  isCorrect: boolean,
  questionContent: string,
  era: string,
  category: string,
  points: number,
  examSlug: string = DEFAULT_EXAM_SLUG,
  subjectSlug: string = DEFAULT_SUBJECT_SLUG,
): void {
  if (isCorrect) {
    resolveWrongAnswer(questionId, examSlug, subjectSlug);
  } else {
    addWrongAnswer(
      {
        questionId,
        examId,
        examNumber,
        questionNumber,
        selectedAnswer,
        correctAnswer,
        questionContent,
        era,
        category,
        points,
      },
      examSlug,
      subjectSlug,
    );
  }
}

/**
 * (examSlug, subjectSlug) tuples that have stored wrong answers.
 */
export interface WrongAnswerSlot {
  examSlug: string;
  subjectSlug: string;
  count: number;
  unresolvedCount: number;
}

export function listWrongAnswerSlots(): WrongAnswerSlot[] {
  if (typeof window === "undefined") return [];
  migrate();
  const out: WrongAnswerSlot[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(KEY_PREFIX)) continue;
    const rest = k.slice(KEY_PREFIX.length);
    const idx = rest.indexOf(":");
    if (idx < 0) continue; // skip legacy v2 (already migrated by migrate())
    const examSlug = rest.slice(0, idx);
    const subjectSlug = rest.slice(idx + 1);
    try {
      const arr = JSON.parse(localStorage.getItem(k) || "[]") as WrongAnswer[];
      out.push({
        examSlug,
        subjectSlug,
        count: arr.length,
        unresolvedCount: arr.filter((a) => !a.resolved).length,
      });
    } catch {
      // ignore corrupt
    }
  }
  return out;
}

/**
 * 시험 단위로 모든 과목 오답 합산.
 */
export function getWrongAnswersByExam(examSlug: string): WrongAnswerSlot[] {
  return listWrongAnswerSlots().filter((s) => s.examSlug === examSlug);
}
