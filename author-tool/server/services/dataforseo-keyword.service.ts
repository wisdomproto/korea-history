import { config } from '../config.js';
import {
  type CompetitionLevel,
  isGoldenKeyword,
  normalizeCompetition,
} from './naver-keyword.service.js';

export interface DataForSeoKeywordData {
  keyword: string;
  searchVolume: number;
  competition: string;
  competitionLevel: CompetitionLevel;
  competitionIndex: number | null;
  cpc: number;
  monthlyTrend: { year: number; month: number; volume: number }[];
  isGolden: boolean;
}

interface DataForSeoRawItem {
  keyword: string;
  search_volume: number | null;
  competition: string | null;
  competition_index: number | null;
  cpc: number | null;
  monthly_searches?: { year: number; month: number; search_volume: number }[];
}

const ENDPOINT = 'https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live';

export function isConfigured(): boolean {
  return !!(config.dataforseo.login && config.dataforseo.password);
}

/**
 * Fetch Google Ads search volumes for a list of keywords via DataForSEO.
 * Returns empty array if credentials are not configured.
 * DataForSEO accepts up to 700 keywords per request.
 */
export async function fetchGoogleKeywords(
  keywords: string[],
): Promise<DataForSeoKeywordData[]> {
  const { login, password, locationCode, languageCode } = config.dataforseo;
  if (!login || !password) {
    console.warn('[DataForSEO] credentials not set — returning empty array');
    return [];
  }
  if (keywords.length === 0) return [];

  const cleaned = [...new Set(keywords.map((k) => k.trim()).filter(Boolean))].slice(0, 700);
  if (cleaned.length === 0) return [];

  const auth = Buffer.from(`${login}:${password}`).toString('base64');
  const body = JSON.stringify([
    {
      keywords: cleaned,
      language_code: languageCode,
      location_code: locationCode,
    },
  ]);

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body,
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error(`[DataForSEO] HTTP ${res.status}: ${txt.slice(0, 500)}`);
    return [];
  }

  const json = (await res.json()) as {
    tasks?: { result?: DataForSeoRawItem[]; status_message?: string }[];
  };

  const result = json.tasks?.[0]?.result;
  if (!Array.isArray(result)) {
    console.warn('[DataForSEO] no result array', json.tasks?.[0]?.status_message);
    return [];
  }

  return result.map((item) => {
    const volume = item.search_volume ?? 0;
    const compRaw = item.competition ?? '';
    const competitionLevel = normalizeCompetition(compRaw);
    return {
      keyword: item.keyword,
      searchVolume: volume,
      competition: compRaw || '낮음',
      competitionLevel,
      competitionIndex: item.competition_index ?? null,
      cpc: item.cpc ?? 0,
      monthlyTrend: (item.monthly_searches ?? []).map((m) => ({
        year: m.year,
        month: m.month,
        volume: m.search_volume,
      })),
      isGolden: isGoldenKeyword(volume, competitionLevel),
    };
  });
}
