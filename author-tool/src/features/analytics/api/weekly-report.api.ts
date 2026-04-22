import { apiGet, apiPost, apiDelete } from '../../../lib/axios';
import type { WeeklyReport, WeeklyReportsResponse } from '../types/weekly-report.types';

const BASE = '/weekly-reports';

export async function fetchWeeklyReports(): Promise<WeeklyReportsResponse> {
  return apiGet<WeeklyReportsResponse>(BASE);
}

export async function fetchWeeklyReport(weekStart: string): Promise<WeeklyReport> {
  return apiGet<WeeklyReport>(`${BASE}/${weekStart}`);
}

export async function generateWeeklyReport(params?: {
  weekStart?: string;
  weekEnd?: string;
}): Promise<WeeklyReport> {
  return apiPost<WeeklyReport>(`${BASE}/generate`, params ?? {});
}

export async function deleteWeeklyReport(weekStart: string): Promise<void> {
  return apiDelete<void>(`${BASE}/${weekStart}`);
}
