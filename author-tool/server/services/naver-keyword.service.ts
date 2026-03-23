import crypto from 'crypto';
import { config } from '../config.js';
import { generateText, parseJSON } from './gemini.provider.js';

export interface NaverKeywordData {
  keyword: string;
  pcSearchVolume: number;
  mobileSearchVolume: number;
  totalSearchVolume: number;
  competition: string; // LOW, MEDIUM, HIGH
  pcCtr: number;
  mobileCtr: number;
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

    return {
      keyword: item.relKeyword,
      pcSearchVolume: pcVol,
      mobileSearchVolume: mobileVol,
      totalSearchVolume: pcVol + mobileVol,
      competition: item.compIdx ?? 'LOW',
      pcCtr: item.monthlyAvePcCtr ?? 0,
      mobileCtr: item.monthlyAveMobileCtr ?? 0,
    };
  });
}

/**
 * Suggest Naver blog SEO keywords for a given topic using Gemini.
 */
export async function suggestKeywords(topic: string, baseArticle?: string): Promise<string[]> {
  const articleContext = baseArticle
    ? `\n\n참고 글:\n${baseArticle.slice(0, 2000)}`
    : '';

  const prompt = `다음 주제에 대한 네이버 블로그 SEO 키워드 10개를 추천해주세요.
주제: ${topic}${articleContext}

JSON 배열로 응답: ["키워드1", "키워드2", ...]`;

  const raw = await generateText(prompt);
  return parseJSON<string[]>(raw, '키워드 추천 실패');
}
