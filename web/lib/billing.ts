/**
 * 멤버십 정기결제(토스 빌링) 공통 상수/헬퍼.
 * 클라이언트·서버 양쪽에서 import 가능 (secretKey 는 여기 두지 않음 — confirm route 에서 직접).
 */

export const PLAN_NAME = "기출노트 프리미엄";
export const PLAN_PRICE_KRW = 4900; // 월 구독가 (조정 시 여기만 변경)
export const PLAN_PERIOD_DAYS = 30;

// 클라 위젯용 (NEXT_PUBLIC). 없으면 결제 페이지가 "준비 중" 안내.
export const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || "";
export const BILLING_ENABLED = Boolean(TOSS_CLIENT_KEY);

/** 토스 customerKey — 사용자별 고유, 영숫자(2~50자). user.id(uuid) 기반. */
export function toCustomerKey(userId: string): string {
  return `gc_${userId.replace(/-/g, "")}`.slice(0, 50);
}

/** 주문 ID — 결제 1건 고유 식별 (6~64자 영숫자/-/_). */
export function makeOrderId(userId: string, ts: number): string {
  return `gc_${userId.replace(/-/g, "").slice(0, 12)}_${ts}`;
}

export const TOSS_API_BASE = "https://api.tosspayments.com";
