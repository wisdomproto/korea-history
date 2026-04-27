/**
 * Client-safe: 어느 Subject label이 자동 단권화 노트와 매칭되는지 알려주는 정적 Set/Map.
 * lib/civil-notes.ts (서버 전용, fs 사용)와 동기화 필요 — SUBJECT_TO_NOTE 변경 시 함께 업데이트.
 */

const SUBJECT_TO_NOTE_SLUG: Record<string, string> = {
  "행정법총론": "admin-law",
  "행정학개론": "admin-pa",
  "형법총론": "criminal-law",
  "형사소송법개론": "criminal-procedure",
  "회계학": "accounting",
  "세법개론": "tax-law",
  "교정학개론": "corrections",
  "사회복지학개론": "social-welfare",
  "교육학개론": "education",
  "국제법개론": "international-law",
  "관세법개론": "customs-law",
  "국어": "korean",
  "영어": "english",
  "헌법": "constitution",
  // 자격증
  "정보처리기사": "engineer-info-processing",
  "정보처리기사(구)": "engineer-info-processing",
  "산업안전기사": "industrial-safety-engineer",
  "공인중개사 1차": "realtor-1",
  "공인중개사 2차": "realtor-2",
  "컴퓨터활용능력 1급": "computer-skills-1",
  "전기기사": "electrical-engineer",
  "사회조사분석사 2급": "social-research-2",
  "직업상담사 2급": "career-counselor-2",
  // alias (Subject label 변형)
  "행정법": "admin-law",
  "행정학": "admin-pa",
  "형법": "criminal-law",
  "형사소송법": "criminal-procedure",
};

export function hasCivilNoteFor(subjectLabel: string | undefined): boolean {
  if (!subjectLabel) return false;
  return Boolean(SUBJECT_TO_NOTE_SLUG[subjectLabel.trim()]);
}

export function getCivilNoteSlugFor(subjectLabel: string | undefined): string | null {
  if (!subjectLabel) return null;
  return SUBJECT_TO_NOTE_SLUG[subjectLabel.trim()] ?? null;
}
