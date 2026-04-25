/**
 * Multi-Exam Hub data layer.
 *
 * Reads from data/exam-types/, data/subjects/.
 * 3-layer model:
 *   ExamCategory (5)  →  ExamType (16+)  →  Subject (per exam)
 *
 * spec: docs/superpowers/specs/2026-04-25-multi-exam-hub.md
 */
import fs from "fs";
import path from "path";

// ============================================================
// Types
// ============================================================

export type ExamCategoryId = "civil" | "cert" | "driver" | "corporate" | "language";
export type ExamStatus = "live" | "beta" | "coming-soon";

export interface ExamCategorySubcategory {
  id: string;
  label: string;
}

export interface ExamCategory {
  id: ExamCategoryId;
  slug: string;
  label: string;
  icon: string;
  order: number;
  featured: boolean;
  description: string;
  audience?: string[];
  status?: ExamStatus;
  subcategories?: ExamCategorySubcategory[];
}

export interface ExamCategoriesFile {
  version: number;
  updatedAt: string;
  categories: ExamCategory[];
}

export interface SubjectQuestionPool {
  source: "exam-folder" | "cbt-r2" | "notes-index";
  path?: string;
  stem?: string;
}

export interface SubjectStats {
  examCount?: number;
  questionCount?: number;
  noteCount?: number;
}

export interface Subject {
  id: string;
  slug: string;
  label: string;
  shortLabel: string;
  status: ExamStatus;
  etaQuarter?: string;
  questionPool?: SubjectQuestionPool;
  notePool?: SubjectQuestionPool;
  stats?: SubjectStats;
  description: string;
  phase: 0 | 1 | 2 | 3 | 4;
}

export interface SubjectsFile {
  version: number;
  updatedAt: string;
  subjects: Subject[];
}

export interface SubjectRef {
  subjectId: string;
  status: ExamStatus;
  required?: boolean;
  certAccepted?: string[];
  /**
   * Per-exam CBT R2 stem (overrides Subject.questionPool.stem).
   * Same subject (국어) has different content for 9급 국가직 vs 9급 지방직 vs 경찰.
   */
  stem?: string;
}

export interface ExamRoutes {
  main: string;
  exam: string;
  notes: string;
  study: string;
  wrongAnswers: string;
  record: string;
}

export interface ExamMarketSize {
  applicants?: number;
  openings?: number;
  year?: number;
  source?: string;
  note?: string;
}

export interface ExamType {
  id: string;
  slug: string;
  label: string;
  shortLabel: string;
  icon: string;
  category: ExamCategoryId;
  subcategory?: string;
  status: ExamStatus;
  highlight: boolean;
  featured?: boolean;
  order: number;
  popularityScore?: number;
  marketSize?: ExamMarketSize;
  audience?: string[];
  subjects: {
    required: SubjectRef[];
    selectable?: SubjectRef[];
  };
  stats?: SubjectStats;
  description: string;
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
  routes: ExamRoutes;
  legacyRoutes?: Partial<ExamRoutes>;
  /** 직렬 분리: 부모 ExamType이면 true (자녀 직렬 ExamType이 따로 존재) */
  isContainer?: boolean;
  /** 직렬 자식 ExamType이 부모를 참조 */
  parentExamId?: string;
  /** 직렬 식별자 (예: 'haengjeong', 'tax', 'building') */
  jobSeries?: string;
}

export interface ExamTypesFile {
  version: number;
  updatedAt: string;
  examTypes: ExamType[];
}

// Schedule events per exam (loaded from data/exam-schedule/index.json)
export interface ExamScheduleEvent {
  date: string;     // ISO "YYYY-MM-DD"
  label: string;
  type?: string;
}

export interface ExamScheduleFile {
  version: number;
  year: number;
  updatedAt: string;
  source?: string;
  byExam: Record<string, ExamScheduleEvent[]>;
}

// Combined view: ExamType with resolved Subject objects (not just refs)
export interface ResolvedSubjectRef extends SubjectRef {
  subject: Subject;
}

export interface ExamTypeWithSubjects extends Omit<ExamType, "subjects"> {
  subjects: {
    required: ResolvedSubjectRef[];
    selectable: ResolvedSubjectRef[];
  };
}

// ============================================================
// Loader (file reads, cached after first call)
// ============================================================

const DATA_ROOT = path.join(process.cwd(), "..", "data");

let _categories: ExamCategory[] | null = null;
let _examTypes: ExamType[] | null = null;
let _subjects: Subject[] | null = null;
let _schedule: ExamScheduleFile | null = null;

function readJson<T>(rel: string): T {
  const full = path.join(DATA_ROOT, rel);
  return JSON.parse(fs.readFileSync(full, "utf-8"));
}

export function getCategories(): ExamCategory[] {
  if (!_categories) {
    const file = readJson<ExamCategoriesFile>("exam-types/categories.json");
    _categories = [...file.categories].sort((a, b) => a.order - b.order);
  }
  return _categories;
}

export function getCategoryById(id: string): ExamCategory | undefined {
  return getCategories().find((c) => c.id === id);
}

export function getCategoryBySlug(slug: string): ExamCategory | undefined {
  return getCategories().find((c) => c.slug === slug);
}

export function getAllExamTypes(): ExamType[] {
  if (!_examTypes) {
    const file = readJson<ExamTypesFile>("exam-types/index.json");
    _examTypes = [...file.examTypes].sort((a, b) => a.order - b.order);
  }
  return _examTypes;
}

export function getExamTypeBySlug(slug: string): ExamType | undefined {
  return getAllExamTypes().find((e) => e.slug === slug);
}

export function getExamTypeById(id: string): ExamType | undefined {
  return getAllExamTypes().find((e) => e.id === id);
}

export function getExamTypesByCategory(categoryId: ExamCategoryId): ExamType[] {
  return getAllExamTypes().filter((e) => e.category === categoryId);
}

export function getLiveExamTypes(): ExamType[] {
  return getAllExamTypes().filter((e) => e.status === "live");
}

export function getFeaturedExamTypes(): ExamType[] {
  return getAllExamTypes().filter((e) => e.featured && e.status === "live");
}

export function getAllSubjects(): Subject[] {
  if (!_subjects) {
    const file = readJson<SubjectsFile>("subjects/index.json");
    _subjects = file.subjects;
  }
  return _subjects;
}

export function getSubjectById(id: string): Subject | undefined {
  return getAllSubjects().find((s) => s.id === id);
}

export function getSubjectBySlug(slug: string): Subject | undefined {
  return getAllSubjects().find((s) => s.slug === slug);
}

/**
 * Resolve an ExamType's SubjectRefs into full Subject objects.
 * Returns required + selectable each as ResolvedSubjectRef[] (filtered to subjects that exist).
 */
export function getExamTypeWithSubjects(slugOrId: string): ExamTypeWithSubjects | undefined {
  const exam = getExamTypeBySlug(slugOrId) ?? getExamTypeById(slugOrId);
  if (!exam) return undefined;

  const resolveRefs = (refs: SubjectRef[]): ResolvedSubjectRef[] =>
    refs
      .map((ref) => {
        const subject = getSubjectById(ref.subjectId);
        if (!subject) return null;
        return { ...ref, subject };
      })
      .filter((x): x is ResolvedSubjectRef => x !== null);

  return {
    ...exam,
    subjects: {
      required: resolveRefs(exam.subjects.required),
      selectable: resolveRefs(exam.subjects.selectable ?? []),
    },
  };
}

// ============================================================
// Helpers (for hub page / nav)
// ============================================================

export interface CategoryWithExams {
  category: ExamCategory;
  examTypes: ExamType[];
}

/**
 * Group all live exam types by category, ordered for hub display.
 * Coming-soon exams are included so the user can see roadmap.
 *
 * 직렬 분리된 자식 ExamType은 제외 — 카테고리 트리에선 부모만 노출.
 */
export function getCategoriesWithExams(): CategoryWithExams[] {
  const categories = getCategories();
  const allExams = getAllExamTypes().filter((e) => !e.parentExamId);
  return categories.map((category) => ({
    category,
    examTypes: allExams.filter((e) => e.category === category.id),
  }));
}

/**
 * 부모 ExamType이 직렬 분리된 경우, 자식 직렬 ExamType 리스트.
 * 부모가 아니거나 자식이 없으면 빈 배열.
 */
export function getJobSeriesChildren(parentId: string): ExamType[] {
  return getAllExamTypes().filter((e) => e.parentExamId === parentId);
}

/**
 * 직렬 자식 ExamType의 부모.
 */
export function getParentExamType(child: ExamType): ExamType | undefined {
  if (!child.parentExamId) return undefined;
  return getExamTypeById(child.parentExamId);
}

/**
 * Stats for the hub page header (e.g. "728개 시험 · 100만 문항").
 * Counts only live exam types and their stats.
 */
export interface HubStats {
  totalExams: number;
  liveExams: number;
  totalQuestions: number;
  totalNotes: number;
}

export function getHubStats(): HubStats {
  const all = getAllExamTypes();
  const live = all.filter((e) => e.status === "live");
  return {
    totalExams: all.length,
    liveExams: live.length,
    totalQuestions: live.reduce((sum, e) => sum + (e.stats?.questionCount ?? 0), 0),
    totalNotes: live.reduce((sum, e) => sum + (e.stats?.noteCount ?? 0), 0),
  };
}

// ============================================================
// Exam schedule (2026)
// ============================================================

function getSchedule(): ExamScheduleFile {
  if (!_schedule) {
    _schedule = readJson<ExamScheduleFile>("exam-schedule/index.json");
  }
  return _schedule;
}

export function getExamSchedule(examTypeId: string): ExamScheduleEvent[] {
  return getSchedule().byExam[examTypeId] ?? [];
}

export interface NextExamEvent extends ExamScheduleEvent {
  daysUntil: number;
}

/**
 * 가장 가까운 예정된 시험 이벤트. 없으면 null (이미 지난 시험).
 */
export function getNextExamEvent(
  examTypeId: string,
  now: Date = new Date(),
): NextExamEvent | null {
  const events = getExamSchedule(examTypeId);
  const today = new Date(now.toISOString().slice(0, 10) + "T00:00:00Z");
  const upcoming = events
    .map((e) => {
      const d = new Date(e.date + "T00:00:00Z");
      const days = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return { ...e, daysUntil: days };
    })
    .filter((e) => e.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil);
  return upcoming[0] ?? null;
}

/**
 * Reset cache — useful for testing or when data files change.
 */
export function _resetCache(): void {
  _categories = null;
  _examTypes = null;
  _subjects = null;
  _schedule = null;
}
