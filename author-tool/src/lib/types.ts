export type Era = '선사·고조선' | '삼국' | '남북국' | '고려' | '조선 전기' | '조선 후기' | '근대' | '현대';
export type Category = '정치' | '경제' | '사회' | '문화';

export const ERAS: Era[] = ['선사·고조선', '삼국', '남북국', '고려', '조선 전기', '조선 후기', '근대', '현대'];
export const CATEGORIES: Category[] = ['정치', '경제', '사회', '문화'];
export const DIFFICULTIES = [1, 2, 3] as const;
export const POINTS = [1, 2, 3] as const;

export interface Exam {
  id: number;
  examNumber: number;
  name?: string;
  examDate: string;
  examType: 'advanced' | 'basic';
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
  /** @deprecated Source materials are image-only (imageUrl). Kept for backward compat. */
  passage?: string;
  imageUrl?: string;
  choices: [string, string, string, string, string];
  choiceImages?: (string | null)[];
  correctAnswer: number;
  points: number;
  era: Era;
  category: Category;
  difficulty: 1 | 2 | 3;
  explanation?: string;
}

export interface ExamCompleteness {
  hasQuestions: boolean;
  missingAnswers: number;
  missingImages: number;
  missingExplanations: number;
  missingContent: number;
  status: 'complete' | 'partial' | 'incomplete';
}

export interface ExamWithCount extends Exam {
  questionCount: number;
  completeness: ExamCompleteness;
}

export interface ExamFile {
  exam: Exam;
  questions: Question[];
}

export interface GenerateRequest {
  era: Era;
  category: Category;
  difficulty: 1 | 2 | 3;
  points: number;
  count: number;
  topic?: string;
  model?: string;
}

export type GeneratedQuestion = Omit<Question, 'id' | 'examId' | 'questionNumber'>;

export interface ModelInfo {
  id: string;
  label: string;
  default?: boolean;
}

export interface ModelsResponse {
  textModels: ModelInfo[];
  imageModels: ModelInfo[];
}
