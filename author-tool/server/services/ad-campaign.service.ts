import {
  isConfigured as isR2Configured,
  readJson,
  mutateList,
  patchById,
  removeById,
} from './r2-json.service.js';

export type AdPlatform = 'meta' | 'google' | 'naver_search' | 'naver_gfa' | 'youtube' | 'kakao' | 'other';
export type AdStatus = 'draft' | 'active' | 'paused' | 'ended';
export type AdObjective = 'awareness' | 'traffic' | 'engagement' | 'leads' | 'conversions' | 'app' | 'sales';

export interface AdCampaign {
  id: string;
  project_id: string;
  platform: AdPlatform;
  name: string;
  status: AdStatus;
  objective?: AdObjective;
  // Date range
  start_date: string;         // YYYY-MM-DD
  end_date: string | null;    // null = ongoing
  // Budget & spend (KRW)
  budget_total: number;
  spend: number;
  // Core metrics
  impressions: number;
  clicks: number;
  conversions: number;
  conversion_value: number;   // revenue KRW
  // Derived (read-only, computed at read time)
  ctr?: number;
  cpc?: number;
  cpa?: number;
  roas?: number;
  // Memo
  landing_url?: string;
  primary_keyword?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCampaignInput {
  projectId: string;
  platform: AdPlatform;
  name: string;
  status?: AdStatus;
  objective?: AdObjective;
  startDate: string;
  endDate?: string | null;
  budgetTotal?: number;
  spend?: number;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  conversionValue?: number;
  landingUrl?: string;
  primaryKeyword?: string;
  notes?: string;
}

const R2_KEY = 'author-tool/ads/campaigns.json';

export function isConfigured(): boolean {
  return isR2Configured();
}

function makeId(): string {
  return `ad-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function now(): string { return new Date().toISOString(); }

function withDerived(c: AdCampaign): AdCampaign {
  const ctr = c.impressions > 0 ? +(c.clicks / c.impressions * 100).toFixed(2) : 0;
  const cpc = c.clicks > 0 ? Math.round(c.spend / c.clicks) : 0;
  const cpa = c.conversions > 0 ? Math.round(c.spend / c.conversions) : 0;
  const roas = c.spend > 0 ? +(c.conversion_value / c.spend).toFixed(2) : 0;
  return { ...c, ctr, cpc, cpa, roas };
}

export async function createCampaign(input: CreateCampaignInput): Promise<AdCampaign> {
  const camp: AdCampaign = {
    id: makeId(),
    project_id: input.projectId,
    platform: input.platform,
    name: input.name,
    status: input.status ?? 'draft',
    objective: input.objective,
    start_date: input.startDate,
    end_date: input.endDate ?? null,
    budget_total: input.budgetTotal ?? 0,
    spend: input.spend ?? 0,
    impressions: input.impressions ?? 0,
    clicks: input.clicks ?? 0,
    conversions: input.conversions ?? 0,
    conversion_value: input.conversionValue ?? 0,
    landing_url: input.landingUrl,
    primary_keyword: input.primaryKeyword,
    notes: input.notes,
    created_at: now(),
    updated_at: now(),
  };
  await mutateList<AdCampaign>(R2_KEY, (list) => [camp, ...list]);
  return withDerived(camp);
}

export async function listCampaigns(filter?: {
  projectId?: string;
  platform?: AdPlatform;
  status?: AdStatus;
}): Promise<AdCampaign[]> {
  let list = await readJson<AdCampaign[]>(R2_KEY, []);
  if (filter?.projectId) list = list.filter((c) => c.project_id === filter.projectId);
  if (filter?.platform) list = list.filter((c) => c.platform === filter.platform);
  if (filter?.status) list = list.filter((c) => c.status === filter.status);
  list = list
    .slice()
    .sort((a, b) => b.start_date.localeCompare(a.start_date));
  return list.map(withDerived);
}

export async function getCampaign(id: string): Promise<AdCampaign | null> {
  const list = await readJson<AdCampaign[]>(R2_KEY, []);
  const found = list.find((c) => c.id === id);
  return found ? withDerived(found) : null;
}

export async function updateCampaign(
  id: string,
  patch: Partial<AdCampaign>
): Promise<AdCampaign | null> {
  const allowed: Array<keyof AdCampaign> = [
    'platform', 'name', 'status', 'objective',
    'start_date', 'end_date',
    'budget_total', 'spend',
    'impressions', 'clicks', 'conversions', 'conversion_value',
    'landing_url', 'primary_keyword', 'notes',
  ];
  const safe: Partial<AdCampaign> = { updated_at: now() };
  for (const k of allowed) {
    if (k in patch) (safe as Record<string, unknown>)[k] = (patch as Record<string, unknown>)[k];
  }
  const updated = await patchById<AdCampaign>(R2_KEY, id, safe);
  return updated ? withDerived(updated) : null;
}

export async function deleteCampaign(id: string): Promise<void> {
  await removeById<AdCampaign>(R2_KEY, id);
}

export interface AdSummary {
  totalCampaigns: number;
  activeCampaigns: number;
  totalSpend: number;
  totalBudget: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  totalConversionValue: number;
  avgCtr: number;
  avgCpc: number;
  avgCpa: number;
  avgRoas: number;
  byPlatform: Array<{
    platform: AdPlatform;
    campaigns: number;
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    conversionValue: number;
    ctr: number;
    cpc: number;
    cpa: number;
    roas: number;
  }>;
}

export async function summarize(projectId: string): Promise<AdSummary> {
  const campaigns = await listCampaigns({ projectId });
  const sum = {
    spend: 0, budget: 0, impressions: 0, clicks: 0, conversions: 0, conversionValue: 0,
  };
  const byPlatform = new Map<AdPlatform, typeof sum & { campaigns: number }>();

  for (const c of campaigns) {
    sum.spend += c.spend;
    sum.budget += c.budget_total;
    sum.impressions += c.impressions;
    sum.clicks += c.clicks;
    sum.conversions += c.conversions;
    sum.conversionValue += c.conversion_value;

    const p = byPlatform.get(c.platform) ?? {
      spend: 0, budget: 0, impressions: 0, clicks: 0, conversions: 0, conversionValue: 0, campaigns: 0,
    };
    p.spend += c.spend;
    p.budget += c.budget_total;
    p.impressions += c.impressions;
    p.clicks += c.clicks;
    p.conversions += c.conversions;
    p.conversionValue += c.conversion_value;
    p.campaigns++;
    byPlatform.set(c.platform, p);
  }

  return {
    totalCampaigns: campaigns.length,
    activeCampaigns: campaigns.filter((c) => c.status === 'active').length,
    totalSpend: sum.spend,
    totalBudget: sum.budget,
    totalImpressions: sum.impressions,
    totalClicks: sum.clicks,
    totalConversions: sum.conversions,
    totalConversionValue: sum.conversionValue,
    avgCtr: sum.impressions > 0 ? +(sum.clicks / sum.impressions * 100).toFixed(2) : 0,
    avgCpc: sum.clicks > 0 ? Math.round(sum.spend / sum.clicks) : 0,
    avgCpa: sum.conversions > 0 ? Math.round(sum.spend / sum.conversions) : 0,
    avgRoas: sum.spend > 0 ? +(sum.conversionValue / sum.spend).toFixed(2) : 0,
    byPlatform: Array.from(byPlatform.entries())
      .map(([platform, v]) => ({
        platform,
        campaigns: v.campaigns,
        spend: v.spend,
        impressions: v.impressions,
        clicks: v.clicks,
        conversions: v.conversions,
        conversionValue: v.conversionValue,
        ctr: v.impressions > 0 ? +(v.clicks / v.impressions * 100).toFixed(2) : 0,
        cpc: v.clicks > 0 ? Math.round(v.spend / v.clicks) : 0,
        cpa: v.conversions > 0 ? Math.round(v.spend / v.conversions) : 0,
        roas: v.spend > 0 ? +(v.conversionValue / v.spend).toFixed(2) : 0,
      }))
      .sort((a, b) => b.spend - a.spend),
  };
}
