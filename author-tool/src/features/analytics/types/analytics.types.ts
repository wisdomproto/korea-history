export type DatePreset = 'today' | '7d' | '30d' | '90d';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface SeasonPreset {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
}

export interface PresetsData {
  dates: Array<{ id: string; name: string; startDate: string; endDate: string }>;
  seasons: SeasonPreset[];
}

export interface KpiData {
  sessions: number;
  users: number;
  pageViews: number;
  avgSessionDuration: number;
  changes: {
    sessions: number;
    users: number;
    pageViews: number;
    avgSessionDuration: number;
  };
}

export interface ChannelData { channel: string; sessions: number; percentage: number; }
export interface PageData { path: string; pageViews: number; }
export interface CampaignData { source: string; medium: string; campaign: string; sessions: number; }
export interface DeviceData { device: string; sessions: number; percentage: number; }
export interface HourlyData { hour: number; sessions: number; }
export interface DayOfWeekData { dayOfWeek: number; name: string; sessions: number; }
export interface DailyData { date: string; sessions: number; users: number; pageViews: number; avgSessionDuration: number; }

export interface VideoEventsData {
  play: number;
  complete: number;
  completionRate: number;
  bySurface: Array<{ surface: string; play: number; complete: number }>;
  topVideos: Array<{ videoId: string; title: string; play: number; complete: number }>;
}

export interface SearchKeywordData {
  term: string;
  source: string;
  sessions: number;
  users: number;
}

export interface GscQueryRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscPageRow {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscTotals {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchConsoleData {
  siteUrl: string;
  totals: GscTotals;
  queries: GscQueryRow[];
  pages: GscPageRow[];
  cachedAt?: string;
}

export interface DashboardData {
  overview: KpiData;
  channels: ChannelData[];
  topPages: PageData[];
  campaigns: CampaignData[];
  devices: DeviceData[];
  hourly: HourlyData[];
  dayOfWeek: DayOfWeekData[];
  videoEvents: VideoEventsData;
  searchKeywords: SearchKeywordData[];
  cachedAt?: string;
}
