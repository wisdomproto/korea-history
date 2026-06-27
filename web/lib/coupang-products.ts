/**
 * 쿠팡 파트너스 "상품 링크" 큐레이션 — 페이지 주제별 추천 상품 매핑.
 *
 * 각 값은 쿠팡 파트너스에서 "상품 링크" 생성 시 나오는 HTML iframe 의 src
 * (예: "https://coupa.ng/cnGE78"). 제휴 트래킹 코드가 URL 에 이미 포함돼 있어
 * env 설정 없이 그대로 임베드하면 수수료가 적립된다.
 *
 * 상품 추가/교체: 파트너스 → 링크 생성 → 상품 링크 → 상품 검색·선택 →
 * "이미지+텍스트" HTML 의 iframe src 만 복사해 아래 배열에 추가.
 *
 * 카테고리 키는 페이지가 자기 주제로 조회 (getCoupangProducts).
 *   - "history" : 한국사·한능검 페이지 (메인 트래픽)
 *   - 공무원/자격증 과목별 키는 점진 추가 (장기적으로 Open API 자동화 검토)
 */

export const COUPANG_PRODUCTS: Record<string, string[]> = {
  // 한국사능력검정시험 교재·기출문제집 (직접 큐레이션, 전부 trackingCode AF4431481 검증)
  history: [
    "https://coupa.ng/cnGE78", // 큰별쌤 최태성 별별한국사 심화 상+하 세트
    "https://coupa.ng/cnGIhL", // 큰별쌤 최태성 별별한국사 심화 상+하+기출
    "https://coupa.ng/cnGIdS", // 에듀윌 한능검 시대별 기출문제집 심화 + 필기노트
    "https://coupa.ng/cnGIi3", // 해커스 한능검 심화 2주 합격 + 빈출주제 TOP5
    "https://coupa.ng/cnGIj2", // 원큐패스 서경석 데이트 한국사 심화 + 기출문제집
  ],
};

/** 주제 카테고리의 추천 상품 src 목록 (없으면 빈 배열). */
export function getCoupangProducts(category: string): string[] {
  return COUPANG_PRODUCTS[category] ?? [];
}
