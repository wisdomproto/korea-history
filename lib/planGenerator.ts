import { UserProfile, StudyPlan, WeeklyPlan, Era } from './types';
import { ERAS } from './constants';
import { EXAMS } from '@/data/exams';

const ALL_ERAS: Era[] = ERAS.map((e) => e.key);

/**
 * 사용자 프로필 기반 학습 플랜 자동 생성
 *
 * 알고리즘:
 * 1. 시험일까지 남은 주 수 계산
 * 2. 주차별로 학습할 시대와 풀어야 할 기출 배분
 * 3. 전반: 시대별 학습 → 후반: 기출 모의고사 + 복습
 */
export function generateStudyPlan(profile: UserProfile): StudyPlan {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const examDate = new Date(profile.examDate);
  examDate.setHours(0, 0, 0, 0);

  const diffMs = examDate.getTime() - today.getTime();
  const totalDays = Math.max(Math.ceil(diffMs / (1000 * 60 * 60 * 24)), 7);
  const totalWeeks = Math.max(Math.ceil(totalDays / 7), 1);

  // 사용 가능한 시험 ID들
  const examIds = EXAMS.filter((e) => e.isFree).map((e) => e.id);

  // 학습 단계 분배: 60% 시대별 학습, 30% 기출풀이, 10% 최종 복습
  const learnWeeks = Math.max(Math.ceil(totalWeeks * 0.6), 1);
  const practiceWeeks = Math.max(Math.ceil(totalWeeks * 0.3), 1);
  const reviewWeeks = Math.max(totalWeeks - learnWeeks - practiceWeeks, 0);

  const weeklyPlan: WeeklyPlan[] = [];

  // --- Phase 1: 시대별 학습 ---
  for (let i = 0; i < learnWeeks; i++) {
    const erasPerWeek = Math.ceil(ALL_ERAS.length / learnWeeks);
    const startIdx = i * erasPerWeek;
    const focusEras = ALL_ERAS.slice(startIdx, startIdx + erasPerWeek);

    if (focusEras.length === 0) break;

    const eraNames = focusEras.join(', ');
    weeklyPlan.push({
      week: i + 1,
      goals: [
        `${eraNames} 시대 개념 학습`,
        `단원별 문제 풀기 (${focusEras.length * 5}문항 목표)`,
        '틀린 문제 오답 노트 정리',
      ],
      examIds: [],
      focusEras,
      completed: false,
    });
  }

  // --- Phase 2: 기출 모의고사 풀이 ---
  for (let i = 0; i < practiceWeeks; i++) {
    const examsThisWeek = examIds.slice(
      i * Math.ceil(examIds.length / practiceWeeks),
      (i + 1) * Math.ceil(examIds.length / practiceWeeks),
    );

    weeklyPlan.push({
      week: learnWeeks + i + 1,
      goals: [
        `기출 모의고사 ${examsThisWeek.length}회분 풀기`,
        '시간 관리 연습 (70분 제한)',
        '오답 분석 및 취약 시대 보강',
      ],
      examIds: examsThisWeek,
      focusEras: [],
      completed: false,
    });
  }

  // --- Phase 3: 최종 복습 ---
  if (reviewWeeks > 0) {
    for (let i = 0; i < reviewWeeks; i++) {
      weeklyPlan.push({
        week: learnWeeks + practiceWeeks + i + 1,
        goals: [
          '전체 오답 복습',
          '취약 시대 집중 보강',
          '최종 모의고사 실전 연습',
        ],
        examIds: [],
        focusEras: ALL_ERAS,
        completed: false,
      });
    }
  }

  return {
    weeklyPlan,
    totalWeeks,
    createdAt: new Date().toISOString(),
  };
}
