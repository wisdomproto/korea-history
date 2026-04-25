export type CompetitorChannelType = 'website' | 'blog' | 'youtube' | 'instagram' | 'threads';

export interface CompetitorChannel {
  id: string;
  type: CompetitorChannelType;
  url: string;
  identifier?: string;
  lastSyncedAt?: string;
}

export interface CompetitorContent {
  id: string;
  channelId: string;
  channelType: CompetitorChannelType;
  externalId?: string;
  url?: string;
  title: string;
  publishedAt?: string;
  thumbnailUrl?: string;
  views?: number;
  likes?: number;
  comments?: number;
  topics?: string[];
  keywords?: string[];
}

export interface Competitor {
  id: string;
  project_id: string;
  name: string;
  notes?: string;
  tags?: string[];
  channels: CompetitorChannel[];
  contents: CompetitorContent[];
  topic_clusters?: string[];
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SyncReport {
  channelId: string;
  type: CompetitorChannelType;
  fetched: number;
  message?: string;
}

export interface GapAnalysis {
  ourTopics: string[];
  competitorTopics: string[];
  gaps: Array<{
    topic: string;
    sourceCompetitors: string[];
    suggestedKeywords: string[];
    priority: number;
  }>;
}
