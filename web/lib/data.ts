import fs from "fs";
import path from "path";
import { ExamFile, Exam, Question, Era } from "./types";

const DATA_DIR = path.join(process.cwd(), "..", "data", "questions");

const ERA_ORDER: Era[] = [
  "선사·고조선",
  "삼국",
  "남북국",
  "고려",
  "조선 전기",
  "조선 후기",
  "근대",
  "현대",
];

function readExamFile(filePath: string): ExamFile {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as ExamFile;
}

/** Get all exam files sorted by examNumber descending (newest first). */
export function getAllExams(): ExamFile[] {
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => /^exam-\d+\.json$/.test(f));

  const exams = files.map((f) => readExamFile(path.join(DATA_DIR, f)));
  exams.sort((a, b) => b.exam.examNumber - a.exam.examNumber);
  return exams;
}

/** Get a single exam by examNumber. */
export function getExamByNumber(examNumber: number): ExamFile | null {
  const filePath = path.join(DATA_DIR, `exam-${examNumber}.json`);
  if (!fs.existsSync(filePath)) return null;
  return readExamFile(filePath);
}

/** Get all exam numbers that have data files, sorted descending. */
export function getAllExamNumbers(): number[] {
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => /^exam-\d+\.json$/.test(f));
  return files
    .map((f) => parseInt(f.replace("exam-", "").replace(".json", ""), 10))
    .sort((a, b) => b - a);
}

/** Get a specific question from an exam. */
export function getQuestion(
  examNumber: number,
  questionNumber: number
): { exam: Exam; question: Question; totalQuestions: number } | null {
  const examFile = getExamByNumber(examNumber);
  if (!examFile) return null;

  const question = examFile.questions.find(
    (q) => q.questionNumber === questionNumber
  );
  if (!question) return null;

  return {
    exam: examFile.exam,
    question,
    totalQuestions: examFile.questions.length,
  };
}

type QuestionSummary = {
  examNumber: number;
  questionNumber: number;
  content: string;
  points: number;
};

/** Get questions grouped by era with counts. */
export function getQuestionsByEra(): {
  era: Era;
  count: number;
  questions: QuestionSummary[];
}[] {
  const allExams = getAllExams();
  const eraMap = new Map<string, QuestionSummary[]>();

  for (const { exam, questions } of allExams) {
    for (const q of questions) {
      if (!eraMap.has(q.era)) eraMap.set(q.era, []);
      eraMap.get(q.era)!.push({
        examNumber: exam.examNumber,
        questionNumber: q.questionNumber,
        content: q.content,
        points: q.points,
      });
    }
  }

  return ERA_ORDER.map((era) => ({
    era,
    count: eraMap.get(era)?.length || 0,
    questions: eraMap.get(era) || [],
  }));
}

const CATEGORY_ORDER = ["정치", "경제", "사회", "문화"] as const;

/** Get questions grouped by category with counts. */
export function getQuestionsByCategory(): {
  category: string;
  count: number;
  questions: QuestionSummary[];
}[] {
  const allExams = getAllExams();
  const catMap = new Map<string, QuestionSummary[]>();

  for (const { exam, questions } of allExams) {
    for (const q of questions) {
      if (!catMap.has(q.category)) catMap.set(q.category, []);
      catMap.get(q.category)!.push({
        examNumber: exam.examNumber,
        questionNumber: q.questionNumber,
        content: q.content,
        points: q.points,
      });
    }
  }

  return CATEGORY_ORDER.map((cat) => ({
    category: cat,
    count: catMap.get(cat)?.length || 0,
    questions: catMap.get(cat) || [],
  }));
}

/** Get all keywords with question counts + era, sorted by count desc. */
export function getAllKeywords(): {
  keyword: string;
  questionIds: number[];
  era: string;
}[] {
  const kwPath = path.join(DATA_DIR, "keywords.json");
  if (!fs.existsSync(kwPath)) return [];
  const raw = JSON.parse(fs.readFileSync(kwPath, "utf-8"));
  const kwData: Record<string, number[]> = raw.keywords || raw;

  return Object.entries(kwData)
    .map(([keyword, questionIds]) => {
      // Determine era from first question
      const firstQid = questionIds[0];
      const examNumber = Math.floor(firstQid / 1000);
      const questionNumber = firstQid % 1000;
      const data = getQuestion(examNumber, questionNumber);
      const era = data?.question.era || "기타";
      return { keyword, questionIds, era };
    })
    .sort((a, b) => b.questionIds.length - a.questionIds.length);
}

/** Get questions for a specific keyword. */
export function getQuestionsByKeyword(
  keyword: string
): { examNumber: number; questionNumber: number; content: string; points: number; era: string }[] {
  const keywords = getAllKeywords();
  const entry = keywords.find((k) => k.keyword === keyword);
  if (!entry) return [];

  return entry.questionIds
    .map((qId) => {
      const examNumber = Math.floor(qId / 1000);
      const questionNumber = qId % 1000;
      const data = getQuestion(examNumber, questionNumber);
      if (!data) return null;
      return {
        examNumber: data.exam.examNumber,
        questionNumber: data.question.questionNumber,
        content: data.question.content,
        points: data.question.points,
        era: data.question.era,
      };
    })
    .filter(Boolean) as { examNumber: number; questionNumber: number; content: string; points: number; era: string }[];
}

/** Get all questions across all exams (for sitemap / static params). */
export function getAllQuestionParams(): {
  examNumber: number;
  questionNumber: number;
}[] {
  const allExams = getAllExams();
  const params: { examNumber: number; questionNumber: number }[] = [];

  for (const { exam, questions } of allExams) {
    for (const q of questions) {
      params.push({
        examNumber: exam.examNumber,
        questionNumber: q.questionNumber,
      });
    }
  }

  return params;
}
