// Shared types between web app and data files
// Mirrors ../lib/types.ts but standalone (no Expo dependencies)

export type Era =
  | "선사·고조선"
  | "삼국"
  | "남북국"
  | "고려"
  | "조선 전기"
  | "조선 후기"
  | "근대"
  | "현대";

export type Category = "정치" | "경제" | "사회" | "문화";

export interface Exam {
  id: number;
  examNumber: number;
  name?: string;
  examDate: string;
  examType: "advanced" | "basic";
  totalQuestions: number;
  timeLimitMinutes: number;
  isFree: boolean;
  isVisible?: boolean;
}

export interface Question {
  id: number;
  examId: number;
  questionNumber: number;
  content: string;
  passage?: string;
  imageUrl?: string;
  choices: [string, string, string, string, string];
  choiceImages?: (string | null)[];
  correctAnswer: number; // 1-5
  points: number;
  era: Era;
  category: Category;
  difficulty: 1 | 2 | 3;
  explanation?: string;
  keywords?: string[];
}

export interface ExamFile {
  exam: Exam;
  questions: Question[];
}
