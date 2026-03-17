// Client-side only — localStorage CRUD for wrong answers

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

const STORAGE_KEY = "wrong-answers";

export function getWrongAnswers(): WrongAnswer[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveWrongAnswers(answers: WrongAnswer[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
}

export function addWrongAnswer(entry: Omit<WrongAnswer, "createdAt" | "resolved">): void {
  const answers = getWrongAnswers();
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

  saveWrongAnswers(answers);
}

export function resolveWrongAnswer(questionId: number): void {
  const answers = getWrongAnswers();
  const entry = answers.find((a) => a.questionId === questionId);
  if (entry && !entry.resolved) {
    entry.resolved = true;
    entry.resolvedAt = new Date().toISOString();
    saveWrongAnswers(answers);
  }
}

/**
 * Handle answer submission — auto-save wrong answers and auto-resolve.
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
  points: number
): void {
  if (isCorrect) {
    resolveWrongAnswer(questionId);
  } else {
    addWrongAnswer({
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
    });
  }
}
