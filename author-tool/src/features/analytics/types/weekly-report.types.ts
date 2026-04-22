export interface WeeklyHighlight {
  label: string;
  value: string;
  delta?: string;
  tone?: 'up' | 'down' | 'flat';
}

export interface WeeklyOverview {
  sessions: number;
  users: number;
  pageViews: number;
  avgSessionDuration: number;
  bounceRate: number;
  engagementRate: number;
  newUsers: number;
}

export interface WeeklyChanges {
  sessions: number;
  users: number;
  pageViews: number;
  avgSessionDuration: number;
}

export interface WeeklyChannel {
  channel: string;
  sessions: number;
  users: number;
  percentage: number;
}

export interface WeeklyDevice {
  device: string;
  sessions: number;
  percentage: number;
}

export interface WeeklyTopPage {
  path: string;
  pageViews: number;
  users: number;
  engagementPerView: number;
}

export interface WeeklyLandingPage {
  path: string;
  sessions: number;
  bounceRate: number;
  engagementRate: number;
}

export interface WeeklyVideoEvent {
  name: string;
  count: number;
}

export interface WeeklyExamFunnel {
  page: string;
  users: number;
  pv: number;
}

export interface WeeklyPageGroup {
  pv: number;
  sessions: number;
  engPerPV: number;
}

export interface WeeklySnapshot {
  weekStart: string;
  weekEnd: string;
  overview: WeeklyOverview;
  changes: WeeklyChanges;
  daily: Array<{ date: string; users: number; pageViews: number; sessions: number }>;
  channels: WeeklyChannel[];
  devices: WeeklyDevice[];
  topPages: WeeklyTopPage[];
  pageGroups: Record<string, WeeklyPageGroup>;
  landingPages: WeeklyLandingPage[];
  videoEvents: WeeklyVideoEvent[];
  examFunnel: WeeklyExamFunnel[];
}

export interface WeeklyReport {
  id: string;
  week_start: string;
  week_end: string;
  data: WeeklySnapshot;
  ai_summary: string | null;
  highlights: WeeklyHighlight[] | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface WeeklyReportsResponse {
  configured: boolean;
  reports: WeeklyReport[];
}
