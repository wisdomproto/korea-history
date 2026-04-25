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
  start_date: string;
  end_date: string | null;
  budget_total: number;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  conversion_value: number;
  ctr?: number;
  cpc?: number;
  cpa?: number;
  roas?: number;
  landing_url?: string;
  primary_keyword?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
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
