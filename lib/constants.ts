import { Era, Category } from './types';

// 이미지 서버 URL — Expo requires EXPO_PUBLIC_ prefix
export const IMAGE_BASE_URL = process.env.EXPO_PUBLIC_R2_URL || 'http://localhost:3001';

// 앱 색상
export const COLORS = {
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  primaryLight: '#EEF2FF',
  gradient: '#EC4899',
  secondary: '#F59E0B',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  background: '#EEF2FF',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  text: '#0F172A',
  textSecondary: '#64748B',
  textLight: '#94A3B8',
  border: '#E2E8F0',
  disabled: '#CBD5E1',
};

// 디자인 토큰
export const SHADOWS = {
  sm: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  lg: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
  },
} as const;

export const RADIUS = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  full: 9999,
} as const;

// 시대 목록 및 색상
export const ERAS: { key: Era; label: string; color: string }[] = [
  { key: '선사·고조선', label: '선사·고조선', color: '#8B4513' },
  { key: '삼국', label: '삼국시대', color: '#CD5C5C' },
  { key: '남북국', label: '남북국시대', color: '#DAA520' },
  { key: '고려', label: '고려', color: '#2E8B57' },
  { key: '조선 전기', label: '조선 전기', color: '#4169E1' },
  { key: '조선 후기', label: '조선 후기', color: '#6A5ACD' },
  { key: '근대', label: '근대', color: '#DC143C' },
  { key: '현대', label: '현대', color: '#008B8B' },
];

// 유형 목록
export const CATEGORIES: { key: Category; label: string }[] = [
  { key: '정치', label: '정치' },
  { key: '경제', label: '경제' },
  { key: '사회', label: '사회' },
  { key: '문화', label: '문화' },
];

// 급수 판정 기준 (심화)
export const GRADE_CRITERIA_ADVANCED = [
  { grade: '1급', minScore: 80 },
  { grade: '2급', minScore: 70 },
  { grade: '3급', minScore: 60 },
];

// 급수 판정 기준 (기본)
export const GRADE_CRITERIA_BASIC = [
  { grade: '4급', minScore: 80 },
  { grade: '5급', minScore: 70 },
  { grade: '6급', minScore: 60 },
];

export function getGrade(score: number, examType: 'advanced' | 'basic'): string {
  const criteria = examType === 'advanced' ? GRADE_CRITERIA_ADVANCED : GRADE_CRITERIA_BASIC;
  for (const c of criteria) {
    if (score >= c.minScore) return c.grade;
  }
  return '불합격';
}
