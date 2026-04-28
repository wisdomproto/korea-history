/**
 * Per-note SEO boost — surfaces golden keywords (네이버 API 실측, 2026-04-28)
 * in title/description/keywords for notes that match high-volume queries.
 *
 * Source: docs/seo-strategy.html § 06 + memory/seo_strategy_v1.md
 */

export interface NoteSeoBoost {
  /** Primary golden keyword surfaced in <title> and h1 */
  primary: string;
  /** Additional keywords to densify */
  extra: string[];
  /** Monthly Naver search volume (for prioritization tooling, not user-visible) */
  volume: number;
}

export const NOTE_SEO_BOOST: Record<string, NoteSeoBoost> = {
  // s1 — 통일신라/발해 (s1 = 신라/통일신라/발해, NOT 선사)
  's1-07': { primary: '혜공왕 업적', extra: ['통일신라 왕업적', '신라 하대'], volume: 0 },
  's1-09': { primary: '발해 멸망', extra: ['발해 역사', '발해 건국'], volume: 1560 },

  // s2 — 고려
  's2-02': { primary: '후삼국 통일', extra: ['고려 후삼국 통일 과정', '왕건', '신검'], volume: 640 },
  's2-03': { primary: '광종 업적', extra: ['노비안검법', '과거제', '고려 왕업적'], volume: 4600 },
  's2-09': { primary: '음서제', extra: ['고려 신분 구조', '고려 사회'], volume: 900 },

  // s3 — 조선
  's3-02': { primary: '세종대왕 업적', extra: ['훈민정음', '경국대전', '성종 업적', '조선 왕업적'], volume: 19440 },
  's3-04': { primary: '경국대전', extra: ['조선 중앙 행정 조직', '의정부', '6조'], volume: 5890 },
  's3-08': { primary: '임진왜란 결과', extra: ['임진왜란 과정', '정유재란', '이순신'], volume: 120 },
  's3-09': { primary: '병자호란', extra: ['광해군 업적', '광해군 평가', '광해군 중립외교', '정묘호란'], volume: 20730 },
  's3-11': { primary: '대동법', extra: ['균역법', '영정법', '조선 수취 체제', '조선 후기 경제'], volume: 13280 },
  's3-18': { primary: '환국', extra: ['경신환국', '기사환국', '갑술환국', '숙종'], volume: 2640 },

  // s5 — 개항기
  's5-01': { primary: '흥선대원군 정책', extra: ['흥선대원군 개혁', '경복궁 중건', '서원 철폐'], volume: 270 },
  's5-02': { primary: '개화반대론자', extra: ['위정척사파', '최익현', '이항로', '개화 반대 운동'], volume: 0 },
  's5-04': { primary: '대한제국', extra: ['광무개혁', '을사조약 내용', '국권 피탈'], volume: 7400 },

  // s6 — 일제강점기
  's6-03': { primary: '3·1 운동', extra: ['삼일운동', '1919년', '독립선언서'], volume: 0 },

  // s7 — 현대
  's7-11': { primary: '5.18', extra: ['5·18 광주민주화운동', '제5공화국', '전두환'], volume: 4540 },
  's7-12': { primary: '6월민주항쟁', extra: ['1987년', '6.10', '직선제 개헌'], volume: 8510 },
};

export function getNoteSeoBoost(noteId: string): NoteSeoBoost | null {
  return NOTE_SEO_BOOST[noteId] ?? null;
}
