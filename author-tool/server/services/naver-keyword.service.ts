import crypto from 'crypto';
import { config } from '../config.js';
import { generateText, parseJSON } from './gemini.provider.js';

export type CompetitionLevel = 'high' | 'medium' | 'low' | 'unknown';

export interface NaverKeywordData {
  keyword: string;
  pcSearchVolume: number;
  mobileSearchVolume: number;
  totalSearchVolume: number;
  competition: string; // 높음/중간/낮음 (Naver) or LOW/MEDIUM/HIGH
  competitionLevel: CompetitionLevel;
  pcCtr: number;
  mobileCtr: number;
  isGolden: boolean;
}

/**
 * Normalize Naver/Google competition value to a 4-level enum.
 * Naver: "높음" / "중간" / "낮음"
 * Google (DataForSEO): "HIGH" / "MEDIUM" / "LOW"
 */
export function normalizeCompetition(raw: string): CompetitionLevel {
  if (!raw) return 'unknown';
  const v = raw.trim().toUpperCase();
  if (v.includes('HIGH') || raw.includes('높음')) return 'high';
  if (v.includes('MEDIUM') || v.includes('MID') || raw.includes('중간')) return 'medium';
  if (v.includes('LOW') || raw.includes('낮음')) return 'low';
  return 'unknown';
}

/**
 * Blog-SEO-oriented heuristic: a keyword is "golden" if it's worth writing a blog post for.
 * Priority is competition (must be low/medium) over volume.
 * Even low-volume (100~) keywords are golden if competition is light — easy ranks.
 * High-competition keywords are NEVER golden regardless of volume.
 */
export function isGoldenKeyword(volume: number, level: CompetitionLevel): boolean {
  if (volume < 100) return false;
  return level === 'low' || level === 'medium';
}

/**
 * Fetch keyword search volume data from Naver Search Ad API.
 * Returns empty array if API keys are not configured.
 */
export async function fetchNaverKeywords(hintKeywords: string[]): Promise<NaverKeywordData[]> {
  const { licenseKey, secretKey, customerId } = config.naver;
  if (!licenseKey || !secretKey || !customerId) {
    console.warn('[NaverKeyword] API keys not set — returning empty array');
    return [];
  }

  if (hintKeywords.length === 0) return [];

  // Naver hintKeywords API does not support spaces in keywords
  // "한능검 가야" → "한능검가야" (remove spaces)
  const cleanedKeywords = [...new Set(hintKeywords.map(k => k.trim().replace(/\s+/g, '')).filter(Boolean))];
  if (cleanedKeywords.length === 0) return [];

  // Naver API can fail with too many keywords — batch in chunks of 5
  const BATCH_SIZE = 5;
  const allResults: NaverKeywordData[] = [];

  for (let i = 0; i < cleanedKeywords.length; i += BATCH_SIZE) {
    const batch = cleanedKeywords.slice(i, i + BATCH_SIZE);
    const results = await fetchBatch(batch, licenseKey, secretKey, customerId);
    allResults.push(...results);
  }

  return allResults;
}

async function fetchBatch(
  keywords: string[],
  licenseKey: string,
  secretKey: string,
  customerId: string,
): Promise<NaverKeywordData[]> {
  const timestamp = String(Date.now());
  const method = 'GET';
  const path = '/keywordstool';
  const message = `${timestamp}.${method}.${path}`;

  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(message)
    .digest('base64');

  const encodedKeywords = keywords.map(k => encodeURIComponent(k.trim())).join(',');
  const url = `https://api.naver.com${path}?hintKeywords=${encodedKeywords}&showDetail=1`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Timestamp': timestamp,
      'X-API-KEY': licenseKey,
      'X-Customer': customerId,
      'X-Signature': signature,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`[NaverKeyword] Batch failed (${keywords.join(',')}): ${response.status} ${body}`);
    return []; // Skip failed batch instead of throwing
  }

  const data = await response.json() as {
    keywordList?: Array<{
      relKeyword: string;
      monthlyPcQcCnt: number | string;
      monthlyMobileQcCnt: number | string;
      compIdx: string;
      monthlyAvePcCtr: number;
      monthlyAveMobileCtr: number;
    }>;
  };

  if (!data.keywordList) return [];

  return data.keywordList.map((item) => {
    const pcVol = typeof item.monthlyPcQcCnt === 'number' ? item.monthlyPcQcCnt : parseInt(String(item.monthlyPcQcCnt), 10) || 0;
    const mobileVol = typeof item.monthlyMobileQcCnt === 'number' ? item.monthlyMobileQcCnt : parseInt(String(item.monthlyMobileQcCnt), 10) || 0;
    const total = pcVol + mobileVol;
    const competition = item.compIdx ?? '낮음';
    const competitionLevel = normalizeCompetition(competition);

    return {
      keyword: item.relKeyword,
      pcSearchVolume: pcVol,
      mobileSearchVolume: mobileVol,
      totalSearchVolume: total,
      competition,
      competitionLevel,
      pcCtr: item.monthlyAvePcCtr ?? 0,
      mobileCtr: item.monthlyAveMobileCtr ?? 0,
      isGolden: isGoldenKeyword(total, competitionLevel),
    };
  });
}

export interface ExpandedSuggestions {
  /** 2~5어절 longtail variations of the seed (focused, intent-driven) */
  longtails: string[];
  /** 1~3어절 adjacent / broader topics that share the same audience */
  adjacent: string[];
}

/**
 * Suggest BOTH longtail variations of the seed AND adjacent broader topics.
 * Adjacent topics are critical for niche markets where the seed itself is
 * over-saturated (e.g. 한능검) — broader related queries (한국사, 최태성, 공무원 한국사)
 * often have 3000+ volume with lower competition.
 */
export async function suggestKeywordsExpanded(topic: string, baseArticle?: string): Promise<ExpandedSuggestions> {
  const articleContext = baseArticle ? `\n\n참고 글:\n${baseArticle.slice(0, 1500)}` : '';

  const prompt = `당신은 네이버 블로그 SEO 전문가입니다. 시드 키워드 "${topic}"를 두 갈래로 확장해주세요.${articleContext}

## 1) longtails (30개) — 시드의 2~5어절 longtail 변형
- 검색 의도가 명확한 형태 (정보형/비교형/후기/문제해결/추천/대상별)
- 단일 broad 키워드 금지
- 예: "한능검 1주일 벼락치기", "한능검 vs 한자검정"

## 2) adjacent (10개) — **시드와 같은 청중을 공유하는 인접 주제 키워드**
- 시드 자체가 포화 시장일 때 트래픽 많은 인접 영역에서 황금 발굴
- **1~3어절 짧은 키워드** (블로그 메타토픽)
- 예시 (시드가 "한능검"일 때):
  * "한국사" (상위 카테고리)
  * "최태성" (관련 인물)
  * "한국사 자격증" (자매 시험)
  * "공무원 한국사" (인접 시장)
  * "한국사 인강" (제품 카테고리)
  * "한국사 공부법" (관련 학습 주제)
  * "한국사능력검정시험" (시드 풀네임/별칭)
  * "에듀윌" / "메가스터디" (관련 브랜드)
  * "수험생" (타겟 라이프스타일)
- 중요: adjacent 키워드는 짧고 broad해야 함 (Naver가 자동 확장 잘 시키게)

## 응답 형식
**JSON만, 다른 텍스트 없이:**
{
  "longtails": ["...", ...30개],
  "adjacent": ["...", ...10개]
}`;

  const raw = await generateText(prompt);
  const parsed = parseJSON<ExpandedSuggestions>(raw, '키워드 확장 실패');
  return {
    longtails: (parsed.longtails ?? []).filter(Boolean),
    adjacent: (parsed.adjacent ?? []).filter(Boolean),
  };
}

/**
 * Suggest blog-friendly longtail keywords for a given topic using Gemini.
 * Targets low-competition, intent-driven phrases that are realistic to rank for.
 */
export async function suggestKeywords(topic: string, baseArticle?: string): Promise<string[]> {
  const articleContext = baseArticle
    ? `\n\n참고 글:\n${baseArticle.slice(0, 2000)}`
    : '';

  const prompt = `당신은 네이버 블로그 SEO 전문가입니다. 주제 "${topic}"로 글을 쓰려는 블로거를 위해, 검색 의도가 명확하고 경쟁이 비교적 낮은 **롱테일 키워드 30개**를 만들어주세요.${articleContext}

## 필수 규칙
1. 각 키워드는 반드시 **2~5어절 longtail** (예: "한능검 1주일 벼락치기", "한능검 vs 한자검정")
2. 단일 broad 키워드 절대 금지 (X: "한능검", "한국사", "공무원")
3. 검색 의도가 명확한 형태여야 함:
   - 정보형: "~방법", "~정리", "~순서", "~기준"
   - 비교형: "~vs~", "~차이", "~중 뭐가"
   - 후기/리뷰: "~후기", "~합격수기", "~경험담"
   - 문제해결: "~안 외워질 때", "~까먹었을 때", "~급하게"
   - 추천/리스트: "~추천 TOP", "~책 추천", "~인강 비교"
   - 대상/상황: "[연령/직업] [주제]", "[기간] [주제]", "[난이도] [주제]"
4. 30개 중 최소 10개는 **검색량은 낮아도 의도가 강한** 초롱테일 (예: "한능검 시대별 정리 PDF", "한능검 60점 받은 후기")
5. 한자/영어 약어 사용 자제, 자연스러운 한국어 검색 쿼리

## 응답 형식
**JSON 배열만, 다른 텍스트 없이:**
["키워드1", "키워드2", ..., "키워드30"]`;

  const raw = await generateText(prompt);
  return parseJSON<string[]>(raw, '키워드 추천 실패');
}
