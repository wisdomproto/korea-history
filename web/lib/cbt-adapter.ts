/**
 * CBT (자격증/직렬과목) 데이터 → 한능검 Question/Exam 형태로 변환.
 * QuestionCard / QuestionWithTracking 같은 한능검 모듈을 그대로 재사용 가능하게 함.
 */
import type { CbtQuestion, CbtExamMeta } from "./cbt-data";
import type { Question, Exam, Era, Category } from "./types";

/**
 * 문자열 hash → 32-bit positive integer (questionId 안정적 부여).
 */
function hashId(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * CBT label에서 회차 번호 추출 (예: "공인중개사 1차 (2024-10-26)" → 24).
 * 추출 못하면 0.
 */
function extractExamNumber(label: string, examId: string): number {
  // examId 형태가 g120241026 같은 패턴이면 마지막 8자 (날짜) 제외 앞 1~2자
  const m = examId.match(/[a-z](\d+)/);
  if (m) return parseInt(m[1].slice(0, 2), 10);
  const labelMatch = label.match(/(\d+)\s*회차?/);
  if (labelMatch) return parseInt(labelMatch[1], 10);
  return 0;
}

export function adaptCbtQuestion(q: CbtQuestion, examInternalId: number): Question {
  // CBT는 4지선다도 있고 5지선다도 있음. 한능검 type은 5-tuple 강제.
  // 빈 문자열로 패딩해서 type 만족.
  const choiceTexts = q.choices.map((c) => c.text || "");
  while (choiceTexts.length < 5) choiceTexts.push("");
  const choices: [string, string, string, string, string] = [
    choiceTexts[0], choiceTexts[1], choiceTexts[2], choiceTexts[3], choiceTexts[4],
  ];

  // 선지 이미지: 첫 이미지의 URL만 사용 (한능검은 string|null 배열)
  const choiceImages: (string | null)[] = q.choices.map((c) =>
    c.images && c.images.length > 0 ? c.images[0].url : null,
  );
  while (choiceImages.length < 5) choiceImages.push(null);

  return {
    id: hashId(q.question_id),
    examId: examInternalId,
    questionNumber: q.number,
    content: q.text || "",
    imageUrl: q.images && q.images.length > 0 ? q.images[0].url : undefined,
    choices,
    choiceImages,
    correctAnswer: q.correct_answer,
    points: 2,
    era: "근대" as Era, // CBT에는 없음 (UI에 표시되어도 의미 없으므로 dummy)
    category: "정치" as Category, // dummy
    difficulty: 2,
    explanation: q.explanation ?? undefined,
  };
}

export function adaptCbtExamMeta(meta: CbtExamMeta): Exam {
  return {
    id: hashId(meta.exam_id),
    examNumber: extractExamNumber(meta.label, meta.exam_id),
    name: meta.label,
    examDate: meta.date,
    examType: "advanced",
    totalQuestions: meta.question_count,
    timeLimitMinutes: 60,
    isFree: true,
  };
}
