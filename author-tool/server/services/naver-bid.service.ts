import crypto from 'crypto';
import { config } from '../config.js';

export interface NaverBidEstimate {
  bid: number;        // 입찰가 (max bid, ₩)
  clicks: number;     // 예상 일 평균 클릭
  impressions: number; // 예상 일 평균 노출
  cost: number;       // 예상 일 평균 비용 (₩)
  cpc: number;        // 파생: cost / clicks
}

export interface NaverBidResult {
  keyword: string;
  estimates: NaverBidEstimate[];
  // Highlight values for typical positions
  cpc1?: number;       // 1위 노출 CPC
  cpc3?: number;       // 3위 평균
  cpc5?: number;       // 5위 평균
  cpcMin?: number;     // 최소 노출 CPC
}

const BASE = 'https://api.searchad.naver.com';
const PATH = '/estimate/performance/keyword';

function getHeaders(): Record<string, string> {
  const { licenseKey, secretKey, customerId } = config.naver;
  if (!licenseKey || !secretKey || !customerId) {
    throw new Error('Naver credentials not set');
  }
  const ts = String(Date.now());
  const message = `${ts}.POST.${PATH}`;
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(message)
    .digest('base64');
  return {
    'Content-Type': 'application/json; charset=UTF-8',
    'X-Timestamp': ts,
    'X-API-KEY': licenseKey,
    'X-Customer': customerId,
    'X-Signature': signature,
  };
}

const DEFAULT_BIDS = [200, 500, 1000, 1500, 2000, 3000, 5000, 8000, 12000];

/**
 * Naver Search Ad estimate/performance — returns predicted clicks/impressions/cost
 * at each max-bid level. CPC derived as cost/clicks.
 *
 * Note: 'bid' = max-bid (광고주가 설정한 최대 입찰가), not realized CPC.
 *       Actual realized CPC is typically lower (cost/clicks).
 */
export async function getKeywordBidEstimate(
  keyword: string,
  bids: number[] = DEFAULT_BIDS,
  device: 'PC' | 'MOBILE' | 'BOTH' = 'BOTH',
): Promise<NaverBidResult | null> {
  const body = JSON.stringify({
    device,
    keywordplus: false,
    key: keyword,
    bids,
  });

  const res = await fetch(BASE + PATH, {
    method: 'POST',
    headers: getHeaders(),
    body,
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error(`[NaverBid] ${keyword} failed: ${res.status} ${txt.slice(0, 200)}`);
    return null;
  }

  const data = (await res.json()) as {
    estimate?: Array<{ bid: number; clicks: number; impressions: number; cost: number }>;
  };

  const estimates: NaverBidEstimate[] = (data.estimate ?? []).map((e) => ({
    bid: e.bid,
    clicks: e.clicks,
    impressions: e.impressions,
    cost: e.cost,
    cpc: e.clicks > 0 ? e.cost / e.clicks : 0,
  }));

  // Heuristic: pick CPC at typical positions
  // 1위 ≈ highest bid that returns clicks (top of list), but realized CPC is the cpc field
  // 3위/5위 ≈ middle bids (rank correlates with bid level)
  const valid = estimates.filter((e) => e.clicks > 0);
  const sorted = [...valid].sort((a, b) => a.cpc - b.cpc);

  return {
    keyword,
    estimates,
    cpcMin: sorted[0]?.cpc,
    cpc5: sorted[Math.floor(sorted.length / 2)]?.cpc,
    cpc3: sorted[Math.floor(sorted.length * 0.7)]?.cpc,
    cpc1: sorted[sorted.length - 1]?.cpc,
  };
}

/**
 * Batch fetch — sequential with small delay to respect API limits.
 */
export async function getBatchBidEstimates(
  keywords: string[],
  options?: { device?: 'PC' | 'MOBILE' | 'BOTH'; bids?: number[]; delayMs?: number },
): Promise<NaverBidResult[]> {
  const out: NaverBidResult[] = [];
  for (const kw of keywords) {
    const r = await getKeywordBidEstimate(kw, options?.bids, options?.device);
    if (r) out.push(r);
    if (options?.delayMs ?? 300) {
      await new Promise((res) => setTimeout(res, options?.delayMs ?? 300));
    }
  }
  return out;
}
