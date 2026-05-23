// AnnouncementBar에 노출할 시의성 공지 메시지.
// 갱신 빈도가 월 1~2회라 코드 상수 + 배포로 충분 (R2/Supabase 인프라 불필요).
// 만료된 메시지는 자동으로 회전에서 제외.

export type Announcement = {
  id: string;
  text: string;
  href: string;
  emoji?: string;
  /** ISO date (YYYY-MM-DD). 이 날짜 0시(KST) 이후 자동 숨김. 생략 시 만료 없음. */
  expiresAt?: string;
};

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "exam-78-congrats",
    emoji: "🎉",
    text: "한능검 78회 보느라 수고하셨어요 — 정답·해설 확인하기",
    href: "/exam/78/1",
    expiresAt: "2026-06-15",
  },
  {
    id: "exam-78-released",
    emoji: "🆕",
    text: "78회 기출 + AI 해설 업로드 완료",
    href: "/exam",
    expiresAt: "2026-06-30",
  },
  {
    id: "civil-9-expansion",
    emoji: "📚",
    text: "9급 공무원도 같은 학습 시스템 — 13과목 단원별 정리",
    href: "/9급-국가직-일반행정",
    // 만료 없음 (상시 cross-sell)
  },
];

/**
 * 현재 시점에 유효한 announcement만 반환.
 * - expiresAt이 없으면 무조건 노출
 * - expiresAt이 있으면 그 날짜 0시(KST) 이전까지만 노출
 */
export function getActiveAnnouncements(now: Date = new Date()): Announcement[] {
  return ANNOUNCEMENTS.filter((a) => {
    if (!a.expiresAt) return true;
    const exp = new Date(`${a.expiresAt}T00:00:00+09:00`);
    return now < exp;
  });
}
