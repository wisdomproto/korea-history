import { apiGet, apiPost } from '../../../lib/axios';
import type { DashboardData, PresetsData } from '../types/analytics.types';

const BASE = '/analytics';

export async function fetchDashboard(start: string, end: string): Promise<DashboardData | null> {
  return apiGet<DashboardData | null>(`${BASE}/dashboard?start=${start}&end=${end}`);
}

export async function fetchPresets(): Promise<PresetsData> {
  return apiGet<PresetsData>(`${BASE}/presets`);
}

export async function refreshCache(): Promise<void> {
  return apiPost<void>(`${BASE}/refresh`);
}
