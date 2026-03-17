import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserAnswer, Era, Category, UserProfile, StudyPlan } from './types';

// ─── 오답 노트 ───

export interface WrongNote {
  questionId: number;
  examId: number;
  questionNumber: number;
  selectedAnswer: number | null;
  correctAnswer: number;
  era: Era;
  category: Category;
  wrongCount: number; // 틀린 횟수
  lastWrongAt: string; // ISO date
  isResolved: boolean; // 복습 후 맞춤
}

const WRONG_NOTES_KEY = '@wrong_notes';

export async function getWrongNotes(): Promise<WrongNote[]> {
  try {
    const data = await AsyncStorage.getItem(WRONG_NOTES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveWrongNotes(notes: WrongNote[]): Promise<void> {
  await AsyncStorage.setItem(WRONG_NOTES_KEY, JSON.stringify(notes));
}

export async function addWrongAnswers(
  examId: number,
  answers: UserAnswer[],
  questionsData: { id: number; questionNumber: number; correctAnswer: number; era: Era; category: Category }[],
): Promise<void> {
  const existing = await getWrongNotes();

  for (const answer of answers) {
    if (answer.isCorrect) continue; // 맞은 문제는 스킵
    if (answer.selectedAnswer == null) continue; // 미응답은 스킵

    const q = questionsData.find((q) => q.id === answer.questionId);
    if (!q) continue;

    const existingNote = existing.find(
      (n) => n.questionId === answer.questionId && n.examId === examId,
    );

    if (existingNote) {
      existingNote.wrongCount++;
      existingNote.lastWrongAt = new Date().toISOString();
      existingNote.selectedAnswer = answer.selectedAnswer;
      existingNote.isResolved = false;
    } else {
      existing.push({
        questionId: answer.questionId,
        examId,
        questionNumber: q.questionNumber,
        selectedAnswer: answer.selectedAnswer,
        correctAnswer: q.correctAnswer,
        era: q.era,
        category: q.category,
        wrongCount: 1,
        lastWrongAt: new Date().toISOString(),
        isResolved: false,
      });
    }
  }

  await saveWrongNotes(existing);
}

export async function resolveWrongNote(questionId: number, examId: number): Promise<void> {
  const notes = await getWrongNotes();
  const note = notes.find((n) => n.questionId === questionId && n.examId === examId);
  if (note) {
    note.isResolved = true;
    await saveWrongNotes(notes);
  }
}

/** Batch update resolved status */
export async function batchUpdateResolved(
  keys: { questionId: number; examId: number }[],
  isResolved: boolean,
): Promise<void> {
  const notes = await getWrongNotes();
  for (const key of keys) {
    const note = notes.find((n) => n.questionId === key.questionId && n.examId === key.examId);
    if (note) note.isResolved = isResolved;
  }
  await saveWrongNotes(notes);
}

/** Batch delete wrong notes */
export async function batchDeleteWrongNotes(
  keys: { questionId: number; examId: number }[],
): Promise<void> {
  const notes = await getWrongNotes();
  const filtered = notes.filter(
    (n) => !keys.some((k) => k.questionId === n.questionId && k.examId === n.examId),
  );
  await saveWrongNotes(filtered);
}

// ─── 해설 캐시 ───

export interface CachedExplanation {
  correctExplanation: string;
  wrongExplanations: Record<number, string>;
  cachedAt: string;
}

const EXPLANATION_CACHE_KEY = '@explanation_cache';

export async function getCachedExplanation(questionId: number): Promise<CachedExplanation | null> {
  try {
    const data = await AsyncStorage.getItem(EXPLANATION_CACHE_KEY);
    const cache: Record<string, CachedExplanation> = data ? JSON.parse(data) : {};
    return cache[String(questionId)] || null;
  } catch {
    return null;
  }
}

export async function cacheExplanation(questionId: number, explanation: CachedExplanation): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(EXPLANATION_CACHE_KEY);
    const cache: Record<string, CachedExplanation> = data ? JSON.parse(data) : {};
    cache[String(questionId)] = explanation;
    await AsyncStorage.setItem(EXPLANATION_CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

// ─── 해설 피드백 ───

export interface ExplanationFeedback {
  questionId: number;
  feedback: 'good' | 'bad';
  createdAt: string;
}

const FEEDBACK_KEY = '@explanation_feedback';

export async function saveFeedback(questionId: number, feedback: 'good' | 'bad'): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(FEEDBACK_KEY);
    const feedbacks: ExplanationFeedback[] = data ? JSON.parse(data) : [];
    const existing = feedbacks.find((f) => f.questionId === questionId);
    if (existing) {
      existing.feedback = feedback;
      existing.createdAt = new Date().toISOString();
    } else {
      feedbacks.push({ questionId, feedback, createdAt: new Date().toISOString() });
    }
    await AsyncStorage.setItem(FEEDBACK_KEY, JSON.stringify(feedbacks));
  } catch {}
}

export async function getFeedback(questionId: number): Promise<'good' | 'bad' | null> {
  try {
    const data = await AsyncStorage.getItem(FEEDBACK_KEY);
    const feedbacks: ExplanationFeedback[] = data ? JSON.parse(data) : [];
    return feedbacks.find((f) => f.questionId === questionId)?.feedback ?? null;
  } catch {
    return null;
  }
}

// ─── 시험 기록 ───

export interface ExamRecord {
  examId: number;
  examNumber: number;
  score: number;
  grade: string;
  correctCount: number;
  totalQuestions: number;
  completedAt: string;
}

const EXAM_RECORDS_KEY = '@exam_records';

export async function getExamRecords(): Promise<ExamRecord[]> {
  try {
    const data = await AsyncStorage.getItem(EXAM_RECORDS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveExamRecord(record: ExamRecord): Promise<void> {
  try {
    const records = await getExamRecords();
    records.push(record);
    await AsyncStorage.setItem(EXAM_RECORDS_KEY, JSON.stringify(records));
  } catch {}
}

// ─── 사용자 프로필 (온보딩) ───

const USER_PROFILE_KEY = '@user_profile';

export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const data = await AsyncStorage.getItem(USER_PROFILE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
}

export async function isOnboardingCompleted(): Promise<boolean> {
  const profile = await getUserProfile();
  return profile?.onboardingCompleted ?? false;
}

// ─── 학습 플랜 ───

const STUDY_PLAN_KEY = '@study_plan';

export async function getStudyPlan(): Promise<StudyPlan | null> {
  try {
    const data = await AsyncStorage.getItem(STUDY_PLAN_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function saveStudyPlan(plan: StudyPlan): Promise<void> {
  await AsyncStorage.setItem(STUDY_PLAN_KEY, JSON.stringify(plan));
}

// ─── 모의고사 중간 저장 (US-08) ───

export interface SavedExamState {
  examId: number;
  answers: { questionId: number; questionNumber: number; selectedAnswer: number | null }[];
  currentIndex: number;
  remainingSeconds: number;
  savedAt: string;
}

const SAVED_EXAM_KEY = '@saved_exam';

export async function getSavedExam(): Promise<SavedExamState | null> {
  try {
    const data = await AsyncStorage.getItem(SAVED_EXAM_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function saveExamState(state: SavedExamState): Promise<void> {
  await AsyncStorage.setItem(SAVED_EXAM_KEY, JSON.stringify(state));
}

export async function clearSavedExam(): Promise<void> {
  await AsyncStorage.removeItem(SAVED_EXAM_KEY);
}

// ─── 프리미엄 구독 상태 (US-28) ───

export interface SubscriptionState {
  isPremium: boolean;
  plan: 'free' | 'monthly' | 'yearly';
  expiresAt: string | null;
  freeExplanationsUsed: Record<number, number[]>; // examId -> questionId[]
}

const SUBSCRIPTION_KEY = '@subscription';

export async function getSubscription(): Promise<SubscriptionState> {
  try {
    const data = await AsyncStorage.getItem(SUBSCRIPTION_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  return { isPremium: false, plan: 'free', expiresAt: null, freeExplanationsUsed: {} };
}

export async function saveSubscription(state: SubscriptionState): Promise<void> {
  await AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(state));
}

export async function canViewExplanation(examId: number, questionId: number): Promise<boolean> {
  const sub = await getSubscription();
  if (sub.isPremium) return true;
  const used = sub.freeExplanationsUsed[examId] || [];
  if (used.includes(questionId)) return true;
  return used.length < 5;
}

export async function markExplanationViewed(examId: number, questionId: number): Promise<void> {
  const sub = await getSubscription();
  if (sub.isPremium) return;
  const used = sub.freeExplanationsUsed[examId] || [];
  if (!used.includes(questionId)) {
    used.push(questionId);
    sub.freeExplanationsUsed[examId] = used;
    await saveSubscription(sub);
  }
}

// ─── 일일 학습 기록 (US-24) ───

export interface DailyStudyLog {
  date: string; // YYYY-MM-DD
  questionsStudied: number;
  wrongReviewed: number;
  minutesSpent: number;
  completed: boolean;
}

const DAILY_STUDY_KEY = '@daily_study';

export async function getDailyStudyLog(date?: string): Promise<DailyStudyLog> {
  const today = date || new Date().toISOString().slice(0, 10);
  try {
    const data = await AsyncStorage.getItem(DAILY_STUDY_KEY);
    const logs: Record<string, DailyStudyLog> = data ? JSON.parse(data) : {};
    return logs[today] || { date: today, questionsStudied: 0, wrongReviewed: 0, minutesSpent: 0, completed: false };
  } catch {
    return { date: today, questionsStudied: 0, wrongReviewed: 0, minutesSpent: 0, completed: false };
  }
}

export async function updateDailyStudy(update: Partial<DailyStudyLog>): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const data = await AsyncStorage.getItem(DAILY_STUDY_KEY);
    const logs: Record<string, DailyStudyLog> = data ? JSON.parse(data) : {};
    const current = logs[today] || { date: today, questionsStudied: 0, wrongReviewed: 0, minutesSpent: 0, completed: false };
    logs[today] = { ...current, ...update };
    await AsyncStorage.setItem(DAILY_STUDY_KEY, JSON.stringify(logs));
  } catch {}
}
