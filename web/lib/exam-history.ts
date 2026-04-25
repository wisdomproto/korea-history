// Client-side exam history — localStorage, scoped by (exam, subject).
//
// v3: keys are namespaced by (examSlug, subjectSlug).
//   exam-history:한능검:한국사
//   exam-history:9급-국가직:국어
//
// Auto-migration: legacy "exam-history" + "exam-history:{slug}" → "exam-history:{slug}:한국사"

export interface ExamRecord {
  examNumber: number;
  score: number;
  total: number;
  percentage: number;
  grade: string;
  wrongByEra: Record<string, number>;
  date: string;
}

const LEGACY_V1_KEY = "exam-history";
const KEY_PREFIX = "exam-history:";
const DEFAULT_EXAM_SLUG = "한능검";
const DEFAULT_SUBJECT_SLUG = "한국사";

const compoundKey = (examSlug: string, subjectSlug: string) =>
  `${KEY_PREFIX}${examSlug}:${subjectSlug}`;

function migrate(): void {
  if (typeof window === "undefined") return;
  // v1 → v3
  const v1 = localStorage.getItem(LEGACY_V1_KEY);
  if (v1) {
    const target = compoundKey(DEFAULT_EXAM_SLUG, DEFAULT_SUBJECT_SLUG);
    if (!localStorage.getItem(target)) localStorage.setItem(target, v1);
    localStorage.removeItem(LEGACY_V1_KEY);
  }
  // v2 (single colon) → v3
  const v2Keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(KEY_PREFIX)) continue;
    const rest = k.slice(KEY_PREFIX.length);
    if (!rest.includes(":")) v2Keys.push(k);
  }
  for (const old of v2Keys) {
    const examSlug = old.slice(KEY_PREFIX.length);
    const data = localStorage.getItem(old);
    if (!data) continue;
    const target = compoundKey(examSlug, DEFAULT_SUBJECT_SLUG);
    if (!localStorage.getItem(target)) localStorage.setItem(target, data);
    localStorage.removeItem(old);
  }
}

export function getExamHistory(
  examSlug: string = DEFAULT_EXAM_SLUG,
  subjectSlug: string = DEFAULT_SUBJECT_SLUG,
): ExamRecord[] {
  if (typeof window === "undefined") return [];
  migrate();
  try {
    const raw = localStorage.getItem(compoundKey(examSlug, subjectSlug));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveExamRecord(
  record: Omit<ExamRecord, "date" | "grade">,
  examSlug: string = DEFAULT_EXAM_SLUG,
  subjectSlug: string = DEFAULT_SUBJECT_SLUG,
): void {
  if (typeof window === "undefined") return;
  const history = getExamHistory(examSlug, subjectSlug);

  const grade = getGrade(record.percentage);

  const existing = history.findIndex((r) => r.examNumber === record.examNumber);
  const entry: ExamRecord = {
    ...record,
    grade,
    date: new Date().toISOString(),
  };

  if (existing >= 0) history[existing] = entry;
  else history.push(entry);

  history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  localStorage.setItem(compoundKey(examSlug, subjectSlug), JSON.stringify(history));
}

function getGrade(percentage: number): string {
  if (percentage >= 80) return "1급";
  if (percentage >= 70) return "2급";
  if (percentage >= 60) return "3급";
  return "불합격";
}

export function getGradeColor(grade: string): { bg: string; text: string; border: string } {
  switch (grade) {
    case "1급": return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" };
    case "2급": return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" };
    case "3급": return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" };
    default: return { bg: "bg-red-50", text: "text-red-600", border: "border-red-200" };
  }
}

export interface HistorySlot {
  examSlug: string;
  subjectSlug: string;
  records: ExamRecord[];
}

export function listHistorySlots(): HistorySlot[] {
  if (typeof window === "undefined") return [];
  migrate();
  const out: HistorySlot[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(KEY_PREFIX)) continue;
    const rest = k.slice(KEY_PREFIX.length);
    const idx = rest.indexOf(":");
    if (idx < 0) continue;
    const examSlug = rest.slice(0, idx);
    const subjectSlug = rest.slice(idx + 1);
    try {
      const records = JSON.parse(localStorage.getItem(k) || "[]") as ExamRecord[];
      out.push({ examSlug, subjectSlug, records });
    } catch {
      // ignore
    }
  }
  return out;
}

export function getHistoryByExam(examSlug: string): HistorySlot[] {
  return listHistorySlots().filter((s) => s.examSlug === examSlug);
}
