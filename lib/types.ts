// 시험 회차
export interface Exam {
  id: number;
  examNumber: number;
  name?: string;              // 시험 이름 (예: "제77회 한국사능력검정시험")
  examDate: string;
  examType: 'advanced' | 'basic'; // 심화 / 기본
  totalQuestions: number;
  timeLimitMinutes: number;
  isFree: boolean;
  isVisible?: boolean;
}

// 문제
export interface Question {
  id: number;
  examId: number;
  questionNumber: number;
  content: string;           // 질문 텍스트
  /** @deprecated Source materials are image-only (imageUrl). Kept for backward compat. */
  passage?: string;
  imageUrl?: string;         // 자료 이미지 URL (사진, 지도, 문화재 등)
  choices: [string, string, string, string, string];
  choiceImages?: (string | null)[]; // 보기가 이미지인 경우 URL 배열
  correctAnswer: number;     // 1-5
  points: number;            // 배점 (1, 2, 3)
  era: Era;
  category: Category;
  difficulty: 1 | 2 | 3;
  explanation?: string;
  keywords?: string[];
}

// 시대
export type Era =
  | '선사·고조선'
  | '삼국'
  | '남북국'
  | '고려'
  | '조선 전기'
  | '조선 후기'
  | '근대'
  | '현대';

// 유형
export type Category = '정치' | '경제' | '사회' | '문화';

// 사용자 답안
export interface UserAnswer {
  questionId: number;
  questionNumber: number;
  selectedAnswer: number | null; // 1-5, null=미답
  isCorrect?: boolean;
}

// 모의고사 시도
export interface ExamAttempt {
  examId: number;
  startedAt: Date;
  completedAt?: Date;
  answers: UserAnswer[];
  score?: number;
  totalPoints?: number;
  grade?: string;
}

// 사용자 프로필 (온보딩 결과)
export interface UserProfile {
  goalGrade: '1급' | '2급' | '3급' | '4급' | '5급' | '6급';
  examDate: string; // ISO date — 시험 예정일
  dailyStudyMinutes: 30 | 60 | 90 | 120;
  onboardingCompleted: boolean;
  createdAt: string;
}

// 학습 플랜
export interface StudyPlan {
  weeklyPlan: WeeklyPlan[];
  totalWeeks: number;
  createdAt: string;
}

export interface WeeklyPlan {
  week: number;
  goals: string[];
  examIds: number[]; // 풀어야 할 모의고사
  focusEras: Era[];  // 집중 학습 시대
  completed: boolean;
}

// 채점 결과
export interface ExamResult {
  score: number;
  totalPoints: number;
  grade: string;
  correctCount: number;
  totalQuestions: number;
  eraStats: Record<Era, { correct: number; total: number }>;
  categoryStats: Record<Category, { correct: number; total: number }>;
}
