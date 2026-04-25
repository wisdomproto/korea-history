// Re-export shared types owned by settings (project-level data)
export type {
  SavedKeyword,
  SavedIdea,
  KeywordSource,
  KeywordStatus,
  IdeaChannel,
  IdeaStatus,
} from '@/features/settings/types';

export interface NaverKeywordRow {
  keyword: string;
  pcSearchVolume: number;
  mobileSearchVolume: number;
  totalSearchVolume: number;
  competition: string;
  pcCtr: number;
  mobileCtr: number;
}

export interface ResearchResponse {
  suggestions: string[];
  keywords: NaverKeywordRow[];
}

export interface GscOpportunity {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscOpportunitiesResponse {
  queries: GscOpportunity[];
  totals: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
}

export interface GeneratedIdea {
  title: string;
  hook: string;
  description: string;
  keywords: string[];
  targetChannel: import('@/features/settings/types').IdeaChannel;
  priority: number;
}
