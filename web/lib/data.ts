import fs from "fs";
import path from "path";
import { ExamFile, Exam, Question } from "./types";

const DATA_DIR = path.join(process.cwd(), "..", "data", "questions");

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
