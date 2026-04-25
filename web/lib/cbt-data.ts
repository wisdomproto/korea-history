/**
 * CBT (자격증/시험) 데이터 fetcher.
 * R2 public URL에서 매니페스트/시험 JSON을 server-side fetch.
 *
 * 데이터 위치:
 *   {R2_PUBLIC_URL}/cbt/{stem}/manifest.json    → CategoryManifest
 *   {R2_PUBLIC_URL}/cbt/{stem}/exams/{examId}.json → CbtExamData
 */

const R2_PUBLIC_URL =
  process.env.R2_PUBLIC_URL || "https://pub-777d764118c647a2a715fb0b17072419.r2.dev";

// ===== Types =====

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

export interface CbtCategoryManifest {
  category: CbtCategory;
  exams: CbtExamMeta[];
}

export interface CbtImage {
  url: string;
  local_path: string | null;
}

export interface CbtChoice {
  number: number;
  text: string;
  is_correct: boolean;
  images: CbtImage[] | null;
}

export interface CbtQuestion {
  question_id: string;
  number: number;
  text: string;
  images: CbtImage[] | null;
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

// ===== Fetchers =====

function buildUrl(stem: string, suffix: string): string {
  // R2 keys are URL-encoded for Korean characters
  return `${R2_PUBLIC_URL}/cbt/${encodeURIComponent(stem)}/${suffix}`;
}

/**
 * CBT 시험 카테고리의 매니페스트 (회차 목록).
 */
export async function getCbtManifest(stem: string): Promise<CbtCategoryManifest | null> {
  const url = buildUrl(stem, "manifest.json");
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) {
      console.warn(`[CBT] manifest ${stem} → ${res.status}`);
      return null;
    }
    return (await res.json()) as CbtCategoryManifest;
  } catch (err) {
    console.error(`[CBT] manifest ${stem} fetch error:`, err);
    return null;
  }
}

/**
 * CBT 시험 한 회차의 전체 문제.
 */
export async function getCbtExam(stem: string, examId: string): Promise<CbtExamData | null> {
  const url = buildUrl(stem, `exams/${examId}.json`);
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) {
      console.warn(`[CBT] exam ${stem}/${examId} → ${res.status}`);
      return null;
    }
    return (await res.json()) as CbtExamData;
  } catch (err) {
    console.error(`[CBT] exam ${stem}/${examId} fetch error:`, err);
    return null;
  }
}

/**
 * 시험-회차 메타만 (해당 examId의 exam_id, label, date 등). exams 배열 안에서 찾음.
 */
export async function getCbtExamMeta(
  stem: string,
  examId: string,
): Promise<CbtExamMeta | null> {
  const manifest = await getCbtManifest(stem);
  return manifest?.exams.find((e) => e.exam_id === examId) ?? null;
}
