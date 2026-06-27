/**
 * 쿠팡 파트너스 상품 큐레이션 — 자체 카드용 데이터.
 *
 * 쿠팡 위젯(iframe) 대신 자체 카드를 렌더하기 위해 상품 메타(코드·제목·이미지)를 보유.
 *   - code  : coupa.ng/{code} 제휴 단축링크 (클릭 추적 = trackingCode AF4431481 포함)
 *   - title : 표시용 제목
 *   - image : 쿠팡 CDN 썸네일 (coupa.ng redirect 의 image 파라미터 → 풀 URL)
 *
 * 메타는 coupa.ng 코드를 resolve(리다이렉트)하면 title·image·link 가 다 나옴.
 * 새 상품 추가: 코드 주면 resolve 해서 아래 배열에 {code,title,image} 추가.
 *
 * 페이지 경로로 알맞은 상품 조회 → getCoupangProductsForPath().
 */

export interface CoupangBook {
  code: string;
  title: string;
  image: string;
}

// 쿠팡 CDN 썸네일 URL (212x212ex = 대시보드 확인된 사이즈)
const IMG = (path: string) =>
  `https://t1c.coupangcdn.com/thumbnails/remote/212x212ex/image/${path}`;

// 한국사능력검정시험 (한능검) — 메인 트래픽
const HISTORY: CoupangBook[] = [
  {
    code: "cnGE78",
    title: "2026 큰별쌤 최태성 별별한국사 한능검 심화 상+하 세트",
    image: IMG("retail/images/15495647252995-82fb4a85-91b1-476f-8495-2d4590ac724e.png"),
  },
  {
    code: "cnGIhL",
    title: "2026 큰별쌤 최태성 별별한국사 한능검 심화 상+하+기출",
    image: IMG("retail/images/73544193832389-405a6465-be5e-4d38-9bee-0d078d479044.jpg"),
  },
  {
    code: "cnGIdS",
    title: "2026 에듀윌 한능검 시대별 기출문제집 심화 + 만점자 필기노트",
    image: IMG("vendor_inventory/983d/87f7fabbdf7db6d85d41e263889d194a01b24a9a61841818d32b99c8c1fb.png"),
  },
  {
    code: "cnGIi3",
    title: "2026 해커스 한능검 심화 2주 합격 + 빈출주제 TOP5",
    image: IMG("retail/images/2025/09/12/12/6/015e9c48-f8d0-434e-af91-a17a82969ab0.png"),
  },
  {
    code: "cnGIj2",
    title: "원큐패스 서경석 데이트 한능검 심화 + 기출문제집 세트",
    image: IMG("vendor_inventory/1bfc/e4d6e4e73e2ddcdb46c6f6f15d020a9820929e7334e12b67ef2e9c89bab2.jpg"),
  },
];

// 공무원 과목별 (직접 큐레이션, 전부 trackingCode AF4431481 검증)
const CIVIL_BY_SUBJECT: Record<string, CoupangBook[]> = {
  영어: [
    {
      code: "cnGIlz",
      title: "2026 해커스공무원 기출 보카 3000+ 영어단어 세트",
      image: IMG("vendor_inventory/ae68/ea3eec41993652b258f523229d8b4c16e70241b6bc43331a536fbf503be4.png"),
    },
  ],
  국어: [
    {
      code: "cnGIov",
      title: "2026 박문각 공무원 박혜선 국어 족집게 문법 40포인트",
      image: IMG("retail/images/2025/07/16/15/0/ace95dc3-fb18-4e42-a0f9-543b6e4750bc.png"),
    },
  ],
  행정법: [
    {
      code: "cnGInm",
      title: "2026 박문각 공무원 강성빈 행정법총론 요기서",
      image: IMG("retail/images/2025/07/08/14/0/23812a83-a929-43bc-a36c-2ef0618406b2.png"),
    },
  ],
  민법: [
    {
      code: "cnGImx",
      title: "박문각 법무사·법원직 민법 객관식 문제집 세트",
      image: IMG("retail/images/2025/04/21/15/5/c3ff3c75-3fa0-41f4-95a8-5450ddd043bd.png"),
    },
  ],
};

// 과목 매칭 안 될 때 보여줄 공무원 일반 묶음
const CIVIL_ALL: CoupangBook[] = Object.values(CIVIL_BY_SUBJECT).flat();

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

/** 명시적 category 조회 (한능검 placement 용). */
export function getCoupangProducts(category: string): CoupangBook[] {
  if (category === "history") return HISTORY;
  return CIVIL_BY_SUBJECT[category] ?? CIVIL_ALL;
}

/**
 * 경로로 알맞은 추천 상품 조회.
 * 한능검 영역 → 한국사 / 공무원 과목 → 과목 매칭(없으면 공무원 일반).
 */
export function getCoupangProductsForPath(pathname: string): CoupangBook[] {
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

  const subjectSlug = segs[1];
  if (subjectSlug) {
    if (subjectSlug.includes("한국사")) return HISTORY;
    for (const key of Object.keys(CIVIL_BY_SUBJECT)) {
      if (subjectSlug.includes(key)) return CIVIL_BY_SUBJECT[key];
    }
  }
  return CIVIL_ALL;
}
