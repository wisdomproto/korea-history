// Re-export shared types owned by settings (project-level data)
export type {
  SavedKeyword,
  SavedIdea,
  KeywordSource,
  KeywordStatus,
  IdeaChannel,
  IdeaStatus,
} from '@/features/settings/types';

export type CompetitionLevel = 'high' | 'medium' | 'low' | 'unknown';

export interface NaverKeywordRow {
  keyword: string;
  pcSearchVolume: number;
  mobileSearchVolume: number;
  totalSearchVolume: number;
  competition: string;
  competitionLevel: CompetitionLevel;
  pcCtr: number;
  mobileCtr: number;
  isGolden: boolean;
}

export interface ResearchResponse {
  suggestions: string[];
  keywords: NaverKeywordRow[];
}

export interface GoogleKeywordRow {
  keyword: string;
  searchVolume: number;
  competition: string;
  competitionLevel: CompetitionLevel;
  competitionIndex: number | null;
  cpc: number;
  monthlyTrend: { year: number; month: number; volume: number }[];
  isGolden: boolean;
}

export interface GoogleResearchResponse {
  suggestions: string[];
  keywords: GoogleKeywordRow[];
}

export interface GoldenKeywordInsight {
  keyword: string;
  totalSearch: number;
  competition: string;
  strategy: string;
  priority: number;
}

export interface GoldenAnalysisResponse {
  goldenKeywords: GoldenKeywordInsight[];
  insights: { title: string; description: string; color: 'teal' | 'amber' | 'coral' | 'purple' }[];
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
