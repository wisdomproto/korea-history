import { apiGet, apiPost } from '../../../lib/axios';
import type { DashboardData, DailyData, PresetsData, SearchConsoleData } from '../types/analytics.types';

const BASE = '/analytics';

export async function fetchSearchConsole(start: string, end: string): Promise<SearchConsoleData | null> {
  return apiGet<SearchConsoleData | null>(`${BASE}/search-console?start=${start}&end=${end}`);
}

export async function fetchGscSetup(): Promise<{ serviceAccountEmail: string | null; siteUrl: string }> {
  return apiGet<{ serviceAccountEmail: string | null; siteUrl: string }>(`${BASE}/gsc-setup`);
}

export async function fetchDashboard(start: string, end: string): Promise<DashboardData | null> {
  return apiGet<DashboardData | null>(`${BASE}/dashboard?start=${start}&end=${end}`);
}

export async function fetchPresets(): Promise<PresetsData> {
  return apiGet<PresetsData>(`${BASE}/presets`);
}

export async function fetchDailyTrend(start: string, end: string): Promise<DailyData[] | null> {
  return apiGet<DailyData[] | null>(`${BASE}/daily?start=${start}&end=${end}`);
}

export async function refreshCache(): Promise<void> {
  return apiPost<void>(`${BASE}/refresh`);
}
