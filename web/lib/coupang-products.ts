/**
 * 쿠팡 파트너스 "상품 링크" 큐레이션 — 페이지 주제별 추천 상품 매핑.
 *
 * 각 값은 쿠팡 파트너스 "상품 링크" iframe 의 src (예: "https://coupa.ng/cnGE78").
 * 제휴 트래킹 코드(AF4431481)가 URL 에 포함돼 env 없이 임베드만 하면 수수료 적립.
 * 상품 추가: 파트너스 → 링크 생성 → 상품 링크 → "이미지+텍스트" HTML 의 iframe src 복사.
 *
 * 페이지가 자기 경로로 알맞은 상품을 조회 → getCoupangProductsForPath().
 *   - 한능검 영역(/exam, /notes, /study, /한능검 등) → 한국사 5종
 *   - 공무원/자격증(/[examSlug]/[subjectSlug]/…) → 과목 매칭 상품, 없으면 공무원 일반 묶음
 */

// 한국사능력검정시험 (한능검) — 메인 트래픽
const HISTORY = [
  "https://coupa.ng/cnGE78", // 큰별쌤 최태성 별별한국사 심화 상+하 세트
  "https://coupa.ng/cnGIhL", // 큰별쌤 최태성 별별한국사 심화 상+하+기출
  "https://coupa.ng/cnGIdS", // 에듀윌 한능검 시대별 기출문제집 심화 + 필기노트
  "https://coupa.ng/cnGIi3", // 해커스 한능검 심화 2주 합격 + 빈출주제 TOP5
  "https://coupa.ng/cnGIj2", // 원큐패스 서경석 데이트 한국사 심화 + 기출문제집
];

// 공무원 과목별 (직접 큐레이션, 전부 trackingCode AF4431481 검증)
const CIVIL_BY_SUBJECT: Record<string, string[]> = {
  영어: ["https://coupa.ng/cnGIlz"], // 해커스공무원 기출보카 3000+ 세트
  국어: ["https://coupa.ng/cnGIov"], // 박문각 박혜선 국어 족집게 문법 40포인트
  행정법: ["https://coupa.ng/cnGInm"], // 박문각 강성빈 행정법총론 요기서
  민법: ["https://coupa.ng/cnGImx"], // 박문각 법무사·법원직 민법 객관식 문제집
};

// 과목 매칭 안 될 때 보여줄 공무원 일반 묶음 (전 과목 책 모음)
const CIVIL_ALL = Object.values(CIVIL_BY_SUBJECT).flat();

// 한능검 영역 최상위 경로 (이 세그먼트로 시작하면 한국사 상품)
const HISTORY_FIRST_SEG = new Set([
  "exam",
  "notes",
  "study",
  "wrong-answers",
  "my-record",
  "blog",
  "keyword",
  "한능검",
]);

/** @deprecated 명시적 category 조회 — 호출부는 getCoupangProductsForPath 권장. */
export function getCoupangProducts(category: string): string[] {
  if (category === "history") return HISTORY;
  return CIVIL_BY_SUBJECT[category] ?? CIVIL_ALL;
}

/**
 * 경로로 알맞은 추천 상품 목록 조회.
 * 한능검 영역 → 한국사 5종 / 공무원 과목 → 과목 매칭(없으면 공무원 일반).
 */
export function getCoupangProductsForPath(pathname: string): string[] {
  const segs = pathname
    .split("/")
    .filter(Boolean)
    .map((s) => {
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    });

  if (segs.length === 0 || HISTORY_FIRST_SEG.has(segs[0])) return HISTORY;

  // 공무원/자격증: /[examSlug]/[subjectSlug]/…
  const subjectSlug = segs[1];
  if (subjectSlug) {
    if (subjectSlug.includes("한국사")) return HISTORY; // 한국사 과목 = 한능검 통합
    for (const key of Object.keys(CIVIL_BY_SUBJECT)) {
      if (subjectSlug.includes(key)) return CIVIL_BY_SUBJECT[key];
    }
  }
  return CIVIL_ALL; // 공무원 시험 랜딩 또는 매칭 안 된 과목
}
