import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { config } from '../config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Types ───

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

export interface ChannelData {
  channel: string;
  sessions: number;
  percentage: number;
}

export interface PageData {
  path: string;
  pageViews: number;
}

export interface CampaignData {
  source: string;
  medium: string;
  campaign: string;
  sessions: number;
}

export interface DeviceData {
  device: string;
  sessions: number;
  percentage: number;
}

export interface HourlyData {
  hour: number;
  sessions: number;
}

export interface DashboardData {
  overview: KpiData;
  channels: ChannelData[];
  topPages: PageData[];
  campaigns: CampaignData[];
  devices: DeviceData[];
  hourly: HourlyData[];
  cachedAt?: string;
}

// ─── Cache ───

const cache = new Map<string, { data: unknown; expiry: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache(key: string, data: unknown, ttlMs: number): void {
  cache.set(key, { data, expiry: Date.now() + ttlMs });
}

export function clearCache(): void {
  cache.clear();
}

// ─── Client ───

let client: BetaAnalyticsDataClient | null = null;

function getClient(): BetaAnalyticsDataClient {
  if (client) return client;
  const keyValue = config.ga4.serviceAccountKey;
  if (!keyValue) throw new Error('GA4_SERVICE_ACCOUNT_KEY not configured');

  let credentials: Record<string, string>;
  if (keyValue.startsWith('{')) {
    credentials = JSON.parse(keyValue);
  } else {
    const keyPath = path.isAbsolute(keyValue)
      ? keyValue
      : path.resolve(__dirname, '../../', keyValue);
    credentials = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
  }
  client = new BetaAnalyticsDataClient({ credentials });
  return client;
}

function getPropertyId(): string {
  const id = config.ga4.propertyId;
  if (!id) throw new Error('GA4_PROPERTY_ID not configured');
  return `properties/${id}`;
}

export function isConfigured(): boolean {
  return !!(config.ga4.propertyId && config.ga4.serviceAccountKey);
}

// ─── Helpers ───

function getCacheTtl(startDate: string, endDate: string): number {
  const today = new Date().toISOString().split('T')[0];
  if (startDate === today && endDate === today) return 0;
  return 60 * 60 * 1000;
}

function getComparisonDates(
  startDate: string,
  endDate: string
): { prevStart: string; prevEnd: string } {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const today = new Date().toISOString().split('T')[0];

  if (startDate === today && endDate === today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yd = yesterday.toISOString().split('T')[0];
    return { prevStart: yd, prevEnd: yd };
  }

  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - diffDays);
  return {
    prevStart: prevStart.toISOString().split('T')[0],
    prevEnd: prevEnd.toISOString().split('T')[0],
  };
}

function calcChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// ─── Query Methods ───

export async function getOverview(
  startDate: string,
  endDate: string
): Promise<KpiData> {
  const cacheKey = `overview:${startDate}:${endDate}`;
  const cached = getCached<KpiData>(cacheKey);
  if (cached) return cached;

  const analyticsClient = getClient();
  const property = getPropertyId();

  const [response] = await analyticsClient.runReport({
    property,
    dateRanges: [{ startDate, endDate }],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'screenPageViews' },
      { name: 'averageSessionDuration' },
    ],
  });

  const row = response.rows?.[0];
  const sessions = Number(row?.metricValues?.[0]?.value ?? 0);
  const users = Number(row?.metricValues?.[1]?.value ?? 0);
  const pageViews = Number(row?.metricValues?.[2]?.value ?? 0);
  const avgSessionDuration = Math.round(
    Number(row?.metricValues?.[3]?.value ?? 0)
  );

  // Comparison period
  const { prevStart, prevEnd } = getComparisonDates(startDate, endDate);
  const [prevResponse] = await analyticsClient.runReport({
    property,
    dateRanges: [{ startDate: prevStart, endDate: prevEnd }],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'screenPageViews' },
      { name: 'averageSessionDuration' },
    ],
  });

  const prevRow = prevResponse.rows?.[0];
  const prevSessions = Number(prevRow?.metricValues?.[0]?.value ?? 0);
  const prevUsers = Number(prevRow?.metricValues?.[1]?.value ?? 0);
  const prevPageViews = Number(prevRow?.metricValues?.[2]?.value ?? 0);
  const prevAvgDuration = Math.round(
    Number(prevRow?.metricValues?.[3]?.value ?? 0)
  );

  const result: KpiData = {
    sessions,
    users,
    pageViews,
    avgSessionDuration,
    changes: {
      sessions: calcChange(sessions, prevSessions),
      users: calcChange(users, prevUsers),
      pageViews: calcChange(pageViews, prevPageViews),
      avgSessionDuration: calcChange(avgSessionDuration, prevAvgDuration),
    },
  };

  const ttl = getCacheTtl(startDate, endDate);
  if (ttl > 0) setCache(cacheKey, result, ttl);
  return result;
}

export async function getChannelBreakdown(
  startDate: string,
  endDate: string
): Promise<ChannelData[]> {
  const cacheKey = `channels:${startDate}:${endDate}`;
  const cached = getCached<ChannelData[]>(cacheKey);
  if (cached) return cached;

  const [res] = await getClient().runReport({
    property: getPropertyId(),
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'sessionDefaultChannelGroup' }],
    metrics: [{ name: 'sessions' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 10,
  });

  const rows = res.rows ?? [];
  const totalSessions = rows.reduce(
    (sum, r) => sum + Number(r.metricValues?.[0]?.value ?? 0),
    0
  );

  const result: ChannelData[] = rows.map((r) => {
    const sessions = Number(r.metricValues?.[0]?.value ?? 0);
    return {
      channel: r.dimensionValues?.[0]?.value ?? 'Unknown',
      sessions,
      percentage:
        totalSessions > 0
          ? Math.round((sessions / totalSessions) * 1000) / 10
          : 0,
    };
  });

  const ttl = getCacheTtl(startDate, endDate);
  if (ttl > 0) setCache(cacheKey, result, ttl);
  return result;
}

export async function getTopPages(
  startDate: string,
  endDate: string,
  limit: number = 10
): Promise<PageData[]> {
  const cacheKey = `pages:${startDate}:${endDate}:${limit}`;
  const cached = getCached<PageData[]>(cacheKey);
  if (cached) return cached;

  const [res] = await getClient().runReport({
    property: getPropertyId(),
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit,
  });

  const rows = res.rows ?? [];
  const result: PageData[] = rows.map((r) => ({
    path: r.dimensionValues?.[0]?.value ?? '/',
    pageViews: Number(r.metricValues?.[0]?.value ?? 0),
  }));

  const ttl = getCacheTtl(startDate, endDate);
  if (ttl > 0) setCache(cacheKey, result, ttl);
  return result;
}

export async function getCampaigns(
  startDate: string,
  endDate: string
): Promise<CampaignData[]> {
  const cacheKey = `campaigns:${startDate}:${endDate}`;
  const cached = getCached<CampaignData[]>(cacheKey);
  if (cached) return cached;

  const [res] = await getClient().runReport({
    property: getPropertyId(),
    dateRanges: [{ startDate, endDate }],
    dimensions: [
      { name: 'sessionSource' },
      { name: 'sessionMedium' },
      { name: 'sessionCampaignName' },
    ],
    metrics: [{ name: 'sessions' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 20,
  });

  const rows = res.rows ?? [];
  const result: CampaignData[] = rows.map((r) => ({
    source: r.dimensionValues?.[0]?.value ?? '(direct)',
    medium: r.dimensionValues?.[1]?.value ?? '(none)',
    campaign: r.dimensionValues?.[2]?.value ?? '(not set)',
    sessions: Number(r.metricValues?.[0]?.value ?? 0),
  }));

  const ttl = getCacheTtl(startDate, endDate);
  if (ttl > 0) setCache(cacheKey, result, ttl);
  return result;
}

export async function getDeviceBreakdown(
  startDate: string,
  endDate: string
): Promise<DeviceData[]> {
  const cacheKey = `devices:${startDate}:${endDate}`;
  const cached = getCached<DeviceData[]>(cacheKey);
  if (cached) return cached;

  const [res] = await getClient().runReport({
    property: getPropertyId(),
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'deviceCategory' }],
    metrics: [{ name: 'sessions' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
  });

  const rows = res.rows ?? [];
  const totalSessions = rows.reduce(
    (sum, r) => sum + Number(r.metricValues?.[0]?.value ?? 0),
    0
  );

  const result: DeviceData[] = rows.map((r) => {
    const sessions = Number(r.metricValues?.[0]?.value ?? 0);
    return {
      device: r.dimensionValues?.[0]?.value ?? 'Unknown',
      sessions,
      percentage:
        totalSessions > 0
          ? Math.round((sessions / totalSessions) * 1000) / 10
          : 0,
    };
  });

  const ttl = getCacheTtl(startDate, endDate);
  if (ttl > 0) setCache(cacheKey, result, ttl);
  return result;
}

export async function getHourlyPattern(
  startDate: string,
  endDate: string
): Promise<HourlyData[]> {
  const cacheKey = `hourly:${startDate}:${endDate}`;
  const cached = getCached<HourlyData[]>(cacheKey);
  if (cached) return cached;

  const [res] = await getClient().runReport({
    property: getPropertyId(),
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'hour' }],
    metrics: [{ name: 'sessions' }],
    orderBys: [{ dimension: { dimensionName: 'hour' } }],
  });

  const rows = res.rows ?? [];
  const hourMap = new Map<number, number>();
  for (const r of rows) {
    const hour = Number(r.dimensionValues?.[0]?.value ?? 0);
    const sessions = Number(r.metricValues?.[0]?.value ?? 0);
    hourMap.set(hour, sessions);
  }

  const result: HourlyData[] = [];
  for (let h = 0; h < 24; h++) {
    result.push({ hour: h, sessions: hourMap.get(h) ?? 0 });
  }

  const ttl = getCacheTtl(startDate, endDate);
  if (ttl > 0) setCache(cacheKey, result, ttl);
  return result;
}

// ─── Dashboard (all-in-one) ───

export async function getDashboard(
  startDate: string,
  endDate: string
): Promise<DashboardData> {
  const cacheKey = `dashboard:${startDate}:${endDate}`;
  const cached = getCached<DashboardData>(cacheKey);
  if (cached) return cached;

  const [overview, channels, topPages, campaigns, devices, hourly] =
    await Promise.all([
      getOverview(startDate, endDate),
      getChannelBreakdown(startDate, endDate),
      getTopPages(startDate, endDate),
      getCampaigns(startDate, endDate),
      getDeviceBreakdown(startDate, endDate),
      getHourlyPattern(startDate, endDate),
    ]);

  const result: DashboardData = {
    overview,
    channels,
    topPages,
    campaigns,
    devices,
    hourly,
    cachedAt: new Date().toISOString(),
  };

  const ttl = getCacheTtl(startDate, endDate);
  if (ttl > 0) setCache(cacheKey, result, ttl);
  return result;
}
