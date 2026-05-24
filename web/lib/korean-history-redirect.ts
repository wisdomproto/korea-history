/**
 * 한국사 통합 라우팅 (2026-05-24 결정):
 *
 * 공무원/자격증의 한국사 과목은 한능검 콘텐츠로 통일.
 * - 자체 CBT 한국사 stem 매핑이 있는 24개 직렬도 모두 한능검 글로벌 라우트로 redirect.
 * - data/exam-types/index.json의 stem 매핑은 그대로 둠 (페이지 redirect만으로 통합).
 *
 * SEO 처리:
 * - 공무원 한국사 자식 페이지는 robots: noindex (색인 차단).
 * - 모든 "공무원 한국사" / "9급 한국사" 검색 트래픽은 한능검 destination 페이지가 흡수.
 * - 한능검 메인/Prose에 cross 키워드를 본문으로 자연 노출 (Task #5).
 */
import type { Metadata } from "next";

export const HISTORY_SUBJECT_ID = "korean-history";

/**
 * 한국사 → 한능검 글로벌 라우트 매핑.
 * 한능검 본인(/한능검/한국사)은 별도로 /한능검 메인 redirect (Subject landing 페이지 내부 처리).
 */
export const HISTORY_ROUTES = {
  main: "/exam",
  exam: "/exam",
  notes: "/notes",
  wrongAnswers: "/wrong-answers",
  myRecord: "/my-record",
  study: "/study",
} as const;

export function isHistorySubject(subjectId: string | undefined | null): boolean {
  return subjectId === HISTORY_SUBJECT_ID;
}

/**
 * 한국사 통합 페이지의 메타데이터 — robots noindex + 한능검 cross 시그널.
 * redirect 직전 메타로 검색엔진이 "이 페이지는 한능검으로 통합됨" 인지하도록.
 *
 * keywords는 cross 시그널용 — noindex라 직접 색인은 안 되지만, follow가 true라
 * 한능검 destination 페이지로 PageRank가 전달됨. 한능검 layout.tsx가 흡수.
 */
export function historyUnifiedMeta(examLabel: string): Metadata {
  return {
    title: `${examLabel} 한국사 — 한능검으로 무료 학습 | 기출노트`,
    description: `${examLabel} 한국사는 한능검 인증으로 대체됩니다. 기출노트의 한능검 1,900+ 기출문제와 87개 시대별 요약노트로 무료 학습 가능. 회원가입 없이 바로 풀이.`,
    keywords: [
      `${examLabel} 한국사`,
      "공무원 한국사",
      "공무원 한국사 한능검",
      "한국사 한능검 대체",
      "한능검 기출문제",
      "한능검 시대별 정리",
      "한능검 단원별 기출",
      "한능검 무료",
      "공무원 한국사 무료",
    ],
    robots: { index: false, follow: true },
  };
}
