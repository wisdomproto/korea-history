/**
 * 무료 하루 문제 한도 — localStorage 기반 (게스트·무료 공통).
 * 프리미엄 사용자는 호출부(useAuth().isPremium)에서 이 체크를 우회한다.
 *
 * - 하루 무료 50문제(1회차). 자정(로컬 타임존)에 날짜 키가 바뀌며 자동 리셋.
 * - 쿠팡 광고(추천템)를 보면 1회당 +50 충전. 충전 횟수도 일자별 기록.
 * - 카운트 단위 = "정답 확인" 액션 (QuestionCard.handleReveal).
 */

export const DAILY_FREE_LIMIT = 50; // 하루 무료 문제 수 (1회차)
export const REFILL_AMOUNT = 50; // 광고(쿠팡) 1회 시청당 충전량

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

const solvedKey = () => `gcnote_quota_${todayStr()}`;
const refillKey = () => `gcnote_refill_${todayStr()}`;

function readInt(key: string): number {
  if (typeof window === "undefined") return 0;
  const v = window.localStorage.getItem(key);
  const n = v ? parseInt(v, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}

function writeInt(key: string, n: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, String(n));
  } catch {
    /* localStorage 비활성(시크릿 등) — 게이팅 무시하고 통과 */
  }
}

export function getSolvedToday(): number {
  return readInt(solvedKey());
}

export function getRefillsToday(): number {
  return readInt(refillKey());
}

export function getLimitToday(): number {
  return DAILY_FREE_LIMIT + getRefillsToday() * REFILL_AMOUNT;
}

export function getRemaining(): number {
  return Math.max(0, getLimitToday() - getSolvedToday());
}

export function canSolveMore(): boolean {
  return getSolvedToday() < getLimitToday();
}

/** 정답 확인 1회 기록 (한도 차감). */
export function recordSolved(): void {
  writeInt(solvedKey(), getSolvedToday() + 1);
}

/** 광고 시청 후 한도 +REFILL_AMOUNT 충전. */
export function addRefill(): void {
  writeInt(refillKey(), getRefillsToday() + 1);
}
