# GA4 Analytics Dashboard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a GA4 analytics dashboard as the default home view in the author-tool, showing site traffic, channel breakdown, UTM campaigns, device and hourly patterns.

**Architecture:** Express server calls GA4 Data API v1 via service account, caches responses in-memory (hybrid: today=realtime, past=1hr), serves data to React frontend via REST endpoints. Dashboard is a new `'analytics'` ActiveView rendered as the default entry screen.

**Tech Stack:** `@google-analytics/data` (GA4 API), Express routes, React + React Query + Tailwind CSS-only charts, Zustand store.

**Spec:** `docs/superpowers/specs/2026-03-25-ga4-dashboard-design.md`

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `server/services/ga4.service.ts` | GA4 Data API wrapper, caching, all 6 query methods + getDashboard |
| `server/services/exam-season.service.ts` | Exam schedule data, season preset date calculation |
| `server/routes/analytics.routes.ts` | REST endpoints: /dashboard, /overview, /refresh, /presets |
| `src/features/analytics/types/analytics.types.ts` | All TypeScript interfaces (KpiData, ChannelData, etc.) |
| `src/features/analytics/api/analytics.api.ts` | Axios wrappers for /api/analytics/* |
| `src/features/analytics/hooks/useAnalytics.ts` | React Query hooks |
| `src/features/analytics/components/AnalyticsDashboard.tsx` | Main dashboard container |
| `src/features/analytics/components/DatePresetBar.tsx` | Period selector + season presets + refresh |
| `src/features/analytics/components/KpiCards.tsx` | 4 KPI metric cards with change % |
| `src/features/analytics/components/ChannelChart.tsx` | Channel breakdown horizontal bars |
| `src/features/analytics/components/TopPagesTable.tsx` | Top 10 pages table |
| `src/features/analytics/components/CampaignTable.tsx` | UTM campaign table |
| `src/features/analytics/components/DeviceChart.tsx` | Device category bar chart |
| `src/features/analytics/components/HourlyChart.tsx` | 24-hour pattern bar chart |

### Modified Files
| File | Change |
|------|--------|
| `server/config.ts` | Add `ga4` section (propertyId, serviceAccountKey) |
| `server/index.ts` | Import + register analytics routes |
| `src/store/editor.store.ts` | Add `'analytics'` to ActiveView, set as default |
| `src/components/Sidebar.tsx` | Add 📊 analytics button |
| `src/App.tsx` (or main layout) | Render AnalyticsDashboard when activeView === 'analytics' |

---

## Chunk 1: Backend Foundation

### Task 1: Install dependency + config

**Files:**
- Modify: `author-tool/package.json`
- Modify: `author-tool/server/config.ts`

- [ ] **Step 1: Install @google-analytics/data**

```bash
cd author-tool && npm install @google-analytics/data
```

- [ ] **Step 2: Add ga4 config to config.ts**

Add after the `naver` block in `server/config.ts`:

```typescript
ga4: {
  propertyId: process.env.GA4_PROPERTY_ID ?? '',
  serviceAccountKey: process.env.GA4_SERVICE_ACCOUNT_KEY ?? '',
},
```

- [ ] **Step 3: Add env vars to .env**

```
GA4_PROPERTY_ID=
GA4_SERVICE_ACCOUNT_KEY=
```

- [ ] **Step 4: Add ga4-key.json to .gitignore**

Append `ga4-key.json` to `author-tool/.gitignore`.

- [ ] **Step 5: Commit**

```bash
git add author-tool/package.json author-tool/package-lock.json author-tool/server/config.ts author-tool/.gitignore
git commit -m "feat(author-tool): add GA4 Data API dependency and config"
```

---

### Task 2: Exam season service

**Files:**
- Create: `author-tool/server/services/exam-season.service.ts`

- [ ] **Step 1: Create exam-season.service.ts**

```typescript
export interface SeasonPreset {
  id: number;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
}

// 2026 exam schedule — update annually
const EXAM_SCHEDULE = [
  { id: 77, date: '2026-02-08', name: '제77회' },
  { id: 78, date: '2026-05-23', name: '제78회' },
  { id: 79, date: '2026-08-09', name: '제79회' },
  { id: 80, date: '2026-10-17', name: '제80회' },
  { id: 81, date: '2026-11-28', name: '제81회' },
];

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/** Returns season presets (D-14 ~ D+7) for each exam */
export function getSeasonPresets(): SeasonPreset[] {
  return EXAM_SCHEDULE.map((exam) => ({
    id: exam.id,
    name: `${exam.id}회 시즌`,
    startDate: addDays(exam.date, -14),
    endDate: addDays(exam.date, 7),
  }));
}

/** Returns standard date presets */
export function getDatePresets(): Array<{ id: string; name: string; startDate: string; endDate: string }> {
  const today = new Date().toISOString().split('T')[0];
  return [
    { id: 'today', name: '오늘', startDate: today, endDate: today },
    { id: '7d', name: '7일', startDate: addDays(today, -6), endDate: today },
    { id: '30d', name: '30일', startDate: addDays(today, -29), endDate: today },
    { id: '90d', name: '90일', startDate: addDays(today, -89), endDate: today },
  ];
}
```

- [ ] **Step 2: Commit**

```bash
git add author-tool/server/services/exam-season.service.ts
git commit -m "feat(author-tool): add exam season preset service"
```

---

### Task 3: GA4 service

**Files:**
- Create: `author-tool/server/services/ga4.service.ts`

- [ ] **Step 1: Create ga4.service.ts with client init + caching**

```typescript
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
  changes: { sessions: number; users: number; pageViews: number; avgSessionDuration: number };
}
export interface ChannelData { channel: string; sessions: number; percentage: number; }
export interface PageData { path: string; pageViews: number; }
export interface CampaignData { source: string; medium: string; campaign: string; sessions: number; }
export interface DeviceData { device: string; sessions: number; percentage: number; }
export interface HourlyData { hour: number; sessions: number; }
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

  // Support both file path and JSON string
  let credentials: Record<string, string>;
  if (keyValue.startsWith('{')) {
    credentials = JSON.parse(keyValue);
  } else {
    const keyPath = path.isAbsolute(keyValue) ? keyValue : path.resolve(__dirname, '../../', keyValue);
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

// ─── Cache TTL logic ───
function getCacheTtl(startDate: string, endDate: string): number {
  const today = new Date().toISOString().split('T')[0];
  if (startDate === today && endDate === today) return 0; // no cache for "today"
  return 60 * 60 * 1000; // 1 hour for past data
}

// ─── Comparison period ───
function getComparisonDates(startDate: string, endDate: string): { prevStart: string; prevEnd: string } {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const today = new Date().toISOString().split('T')[0];
  if (startDate === today && endDate === today) {
    // "today" compares with yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yd = yesterday.toISOString().split('T')[0];
    return { prevStart: yd, prevEnd: yd };
  }

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
```

- [ ] **Step 2: Add the 6 query methods**

Append to the same file:

```typescript
// ─── Query Methods ───

export async function getOverview(startDate: string, endDate: string): Promise<KpiData> {
  const cacheKey = `overview:${startDate}:${endDate}`;
  const cached = getCached<KpiData>(cacheKey);
  if (cached) return cached;

  const analyticsClient = getClient();
  const property = getPropertyId();

  const [currentRes] = await analyticsClient.runReport({
    property,
    dateRanges: [{ startDate, endDate }],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'screenPageViews' },
      { name: 'averageSessionDuration' },
    ],
  });

  const { prevStart, prevEnd } = getComparisonDates(startDate, endDate);
  const [prevRes] = await analyticsClient.runReport({
    property,
    dateRanges: [{ startDate: prevStart, endDate: prevEnd }],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'screenPageViews' },
      { name: 'averageSessionDuration' },
    ],
  });

  const cur = currentRes.rows?.[0]?.metricValues ?? [];
  const prev = prevRes.rows?.[0]?.metricValues ?? [];
  const n = (arr: typeof cur, i: number) => Number(arr[i]?.value ?? 0);

  const result: KpiData = {
    sessions: n(cur, 0),
    users: n(cur, 1),
    pageViews: n(cur, 2),
    avgSessionDuration: Math.round(n(cur, 3)),
    changes: {
      sessions: calcChange(n(cur, 0), n(prev, 0)),
      users: calcChange(n(cur, 1), n(prev, 1)),
      pageViews: calcChange(n(cur, 2), n(prev, 2)),
      avgSessionDuration: calcChange(n(cur, 3), n(prev, 3)),
    },
  };

  const ttl = getCacheTtl(startDate, endDate);
  if (ttl > 0) setCache(cacheKey, result, ttl);
  return result;
}

export async function getChannelBreakdown(startDate: string, endDate: string): Promise<ChannelData[]> {
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

  const total = (res.rows ?? []).reduce((sum, r) => sum + Number(r.metricValues?.[0]?.value ?? 0), 0);
  const result: ChannelData[] = (res.rows ?? []).map((r) => {
    const sessions = Number(r.metricValues?.[0]?.value ?? 0);
    return {
      channel: r.dimensionValues?.[0]?.value ?? 'Unknown',
      sessions,
      percentage: total > 0 ? Math.round((sessions / total) * 100) : 0,
    };
  });

  const ttl = getCacheTtl(startDate, endDate);
  if (ttl > 0) setCache(cacheKey, result, ttl);
  return result;
}

export async function getTopPages(startDate: string, endDate: string, limit = 10): Promise<PageData[]> {
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

  const result: PageData[] = (res.rows ?? []).map((r) => ({
    path: r.dimensionValues?.[0]?.value ?? '/',
    pageViews: Number(r.metricValues?.[0]?.value ?? 0),
  }));

  const ttl = getCacheTtl(startDate, endDate);
  if (ttl > 0) setCache(cacheKey, result, ttl);
  return result;
}

export async function getCampaigns(startDate: string, endDate: string): Promise<CampaignData[]> {
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

  const result: CampaignData[] = (res.rows ?? []).map((r) => ({
    source: r.dimensionValues?.[0]?.value ?? '',
    medium: r.dimensionValues?.[1]?.value ?? '',
    campaign: r.dimensionValues?.[2]?.value ?? '(not set)',
    sessions: Number(r.metricValues?.[0]?.value ?? 0),
  }));

  const ttl = getCacheTtl(startDate, endDate);
  if (ttl > 0) setCache(cacheKey, result, ttl);
  return result;
}

export async function getDeviceBreakdown(startDate: string, endDate: string): Promise<DeviceData[]> {
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

  const total = (res.rows ?? []).reduce((sum, r) => sum + Number(r.metricValues?.[0]?.value ?? 0), 0);
  const result: DeviceData[] = (res.rows ?? []).map((r) => {
    const sessions = Number(r.metricValues?.[0]?.value ?? 0);
    return {
      device: r.dimensionValues?.[0]?.value ?? 'unknown',
      sessions,
      percentage: total > 0 ? Math.round((sessions / total) * 100) : 0,
    };
  });

  const ttl = getCacheTtl(startDate, endDate);
  if (ttl > 0) setCache(cacheKey, result, ttl);
  return result;
}

export async function getHourlyPattern(startDate: string, endDate: string): Promise<HourlyData[]> {
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

  // Fill all 24 hours (some may be missing)
  const hourMap = new Map<number, number>();
  for (const r of res.rows ?? []) {
    hourMap.set(Number(r.dimensionValues?.[0]?.value ?? 0), Number(r.metricValues?.[0]?.value ?? 0));
  }
  const result: HourlyData[] = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    sessions: hourMap.get(h) ?? 0,
  }));

  const ttl = getCacheTtl(startDate, endDate);
  if (ttl > 0) setCache(cacheKey, result, ttl);
  return result;
}

export async function getDashboard(startDate: string, endDate: string): Promise<DashboardData> {
  const cacheKey = `dashboard:${startDate}:${endDate}`;
  const cached = getCached<DashboardData>(cacheKey);
  if (cached) return cached;

  const [overview, channels, topPages, campaigns, devices, hourly] = await Promise.all([
    getOverview(startDate, endDate),
    getChannelBreakdown(startDate, endDate),
    getTopPages(startDate, endDate),
    getCampaigns(startDate, endDate),
    getDeviceBreakdown(startDate, endDate),
    getHourlyPattern(startDate, endDate),
  ]);

  const result: DashboardData = { overview, channels, topPages, campaigns, devices, hourly };

  const ttl = getCacheTtl(startDate, endDate);
  if (ttl > 0) {
    result.cachedAt = new Date().toISOString();
    setCache(cacheKey, result, ttl);
  }
  return result;
}
```

- [ ] **Step 3: Verify server compiles**

```bash
cd author-tool && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add author-tool/server/services/ga4.service.ts
git commit -m "feat(author-tool): add GA4 Data API service with caching"
```

---

### Task 4: Analytics routes

**Files:**
- Create: `author-tool/server/routes/analytics.routes.ts`
- Modify: `author-tool/server/index.ts`

- [ ] **Step 1: Create analytics.routes.ts**

```typescript
import { Router } from 'express';
import * as ga4 from '../services/ga4.service.js';
import { getSeasonPresets, getDatePresets } from '../services/exam-season.service.js';

const router = Router();

// GET /api/analytics/dashboard?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/dashboard', async (req, res, next) => {
  try {
    if (!ga4.isConfigured()) {
      return res.json({ success: true, data: null, message: 'GA4 not configured' });
    }
    const { start, end } = req.query as { start: string; end: string };
    if (!start || !end) {
      return res.status(400).json({ success: false, error: 'start and end query params required' });
    }
    const data = await ga4.getDashboard(start, end);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// GET /api/analytics/overview?start=...&end=...
router.get('/overview', async (req, res, next) => {
  try {
    if (!ga4.isConfigured()) {
      return res.json({ success: true, data: null, message: 'GA4 not configured' });
    }
    const { start, end } = req.query as { start: string; end: string };
    if (!start || !end) {
      return res.status(400).json({ success: false, error: 'start and end query params required' });
    }
    const data = await ga4.getOverview(start, end);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// POST /api/analytics/refresh
router.post('/refresh', (_req, res) => {
  ga4.clearCache();
  res.json({ success: true, data: { cleared: true } });
});

// GET /api/analytics/presets
router.get('/presets', (_req, res) => {
  res.json({
    success: true,
    data: {
      dates: getDatePresets(),
      seasons: getSeasonPresets(),
    },
  });
});

export default router;
```

- [ ] **Step 2: Register route in server/index.ts**

Add import at the top (after other route imports):
```typescript
import analyticsRoutes from './routes/analytics.routes.js';
```

Add route registration (after `app.use('/api/blog-tools', blogToolsRoutes);`):
```typescript
app.use('/api/analytics', analyticsRoutes);
```

- [ ] **Step 3: Verify server compiles**

```bash
cd author-tool && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add author-tool/server/routes/analytics.routes.ts author-tool/server/index.ts
git commit -m "feat(author-tool): add analytics API routes"
```

---

## Chunk 2: Frontend

### Task 5: Types + API + Hooks

**Files:**
- Create: `author-tool/src/features/analytics/types/analytics.types.ts`
- Create: `author-tool/src/features/analytics/api/analytics.api.ts`
- Create: `author-tool/src/features/analytics/hooks/useAnalytics.ts`

- [ ] **Step 1: Create analytics.types.ts**

```typescript
export type DatePreset = 'today' | '7d' | '30d' | '90d';

export interface DateRange {
  startDate: string; // YYYY-MM-DD
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
```

- [ ] **Step 2: Create analytics.api.ts**

```typescript
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
```

- [ ] **Step 3: Create useAnalytics.ts**

```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchDashboard, fetchPresets, refreshCache } from '../api/analytics.api';

export function useDashboard(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['analytics', 'dashboard', startDate, endDate],
    queryFn: () => fetchDashboard(startDate, endDate),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!(startDate && endDate),
  });
}

export function usePresets() {
  return useQuery({
    queryKey: ['analytics', 'presets'],
    queryFn: fetchPresets,
    staleTime: 60 * 60 * 1000, // 1 hour — presets rarely change
  });
}

export function useRefreshDashboard() {
  const queryClient = useQueryClient();
  return async () => {
    await refreshCache();
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
  };
}
```

- [ ] **Step 4: Commit**

```bash
git add author-tool/src/features/analytics/
git commit -m "feat(author-tool): add analytics types, API, and React Query hooks"
```

---

### Task 6: Widget components (KPI + Charts + Tables)

**Files:**
- Create: `author-tool/src/features/analytics/components/KpiCards.tsx`
- Create: `author-tool/src/features/analytics/components/ChannelChart.tsx`
- Create: `author-tool/src/features/analytics/components/TopPagesTable.tsx`
- Create: `author-tool/src/features/analytics/components/CampaignTable.tsx`
- Create: `author-tool/src/features/analytics/components/DeviceChart.tsx`
- Create: `author-tool/src/features/analytics/components/HourlyChart.tsx`

- [ ] **Step 1: Create KpiCards.tsx**

```tsx
import type { KpiData } from '../types/analytics.types';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function ChangeIndicator({ value }: { value: number }) {
  if (value === 0) return <span className="text-xs text-gray-400">— 변동 없음</span>;
  const isUp = value > 0;
  return (
    <span className={`text-xs font-bold ${isUp ? 'text-emerald-600' : 'text-red-500'}`}>
      {isUp ? '▲' : '▼'} {Math.abs(value)}% vs 이전 기간
    </span>
  );
}

export default function KpiCards({ data }: { data: KpiData }) {
  const cards = [
    { label: '세션', value: data.sessions.toLocaleString(), change: data.changes.sessions },
    { label: '사용자', value: data.users.toLocaleString(), change: data.changes.users },
    { label: '페이지뷰', value: data.pageViews.toLocaleString(), change: data.changes.pageViews },
    { label: '평균 체류시간', value: formatDuration(data.avgSessionDuration), change: data.changes.avgSessionDuration },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-xs text-gray-500 font-semibold">{c.label}</div>
          <div className="text-2xl font-black text-gray-900 mt-1">{c.value}</div>
          <ChangeIndicator value={c.change} />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create ChannelChart.tsx**

```tsx
import type { ChannelData } from '../types/analytics.types';

const COLORS = ['#059669', '#2563EB', '#7C3AED', '#EC4899', '#F59E0B', '#6B7280'];

export default function ChannelChart({ data }: { data: ChannelData[] }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className="text-sm font-extrabold mb-3">📡 채널별 유입</div>
      <div className="flex flex-col gap-2">
        {data.map((ch, i) => (
          <div key={ch.channel} className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-24 truncate">{ch.channel}</span>
            <div className="flex-1 bg-gray-100 rounded h-5 overflow-hidden">
              <div
                className="h-full rounded flex items-center pl-1.5 text-white text-[10px] font-bold"
                style={{ width: `${Math.max(ch.percentage, 3)}%`, backgroundColor: COLORS[i % COLORS.length] }}
              >
                {ch.percentage}%
              </div>
            </div>
            <span className="text-xs font-bold w-10 text-right">{ch.sessions}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create TopPagesTable.tsx**

```tsx
import type { PageData } from '../types/analytics.types';

export default function TopPagesTable({ data }: { data: PageData[] }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className="text-sm font-extrabold mb-3">🔥 인기 페이지 TOP 10</div>
      <div className="text-xs">
        {data.map((p) => (
          <div key={p.path} className="flex py-1.5 border-b border-gray-50 last:border-0">
            <span className="flex-1 text-gray-500 truncate">{p.path}</span>
            <span className="font-bold">{p.pageViews.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create CampaignTable.tsx**

```tsx
import type { CampaignData } from '../types/analytics.types';

export default function CampaignTable({ data }: { data: CampaignData[] }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className="text-sm font-extrabold mb-3">🎯 UTM 캠페인별</div>
      <div className="text-xs">
        {data.slice(0, 10).map((c, i) => (
          <div key={i} className="flex py-1.5 border-b border-gray-50 last:border-0">
            <span className="flex-1 truncate">{c.source} / {c.medium}</span>
            <span className="font-bold">{c.sessions}</span>
          </div>
        ))}
        {data.length === 0 && <p className="text-gray-400 text-center py-4">UTM 데이터 없음</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create DeviceChart.tsx**

```tsx
import type { DeviceData } from '../types/analytics.types';

const DEVICE_LABELS: Record<string, string> = { mobile: '모바일', desktop: '데스크톱', tablet: '태블릿' };
const DEVICE_COLORS: Record<string, string> = { mobile: '#059669', desktop: '#2563EB', tablet: '#9CA3AF' };

export default function DeviceChart({ data }: { data: DeviceData[] }) {
  const maxPct = Math.max(...data.map((d) => d.percentage), 1);
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className="text-sm font-extrabold mb-3">📱 기기별</div>
      <div className="flex gap-3 items-end justify-center h-24">
        {data.map((d) => (
          <div key={d.device} className="text-center">
            <div
              className="w-14 rounded-t-lg flex items-center justify-center text-white text-xs font-black"
              style={{
                height: `${Math.max((d.percentage / maxPct) * 80, 8)}px`,
                backgroundColor: DEVICE_COLORS[d.device] ?? '#9CA3AF',
              }}
            >
              {d.percentage}%
            </div>
            <div className="text-[10px] text-gray-500 mt-1">{DEVICE_LABELS[d.device] ?? d.device}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create HourlyChart.tsx**

```tsx
import type { HourlyData } from '../types/analytics.types';

export default function HourlyChart({ data }: { data: HourlyData[] }) {
  const maxSessions = Math.max(...data.map((d) => d.sessions), 1);

  function barColor(sessions: number): string {
    const ratio = sessions / maxSessions;
    if (ratio > 0.7) return '#059669';
    if (ratio > 0.3) return '#BBF7D0';
    return '#E5E7EB';
  }

  // Find peak hour
  const peak = data.reduce((max, d) => (d.sessions > max.sessions ? d : max), data[0]);

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className="text-sm font-extrabold mb-3">🕐 시간대별</div>
      <div className="flex gap-px items-end h-20">
        {data.map((d) => (
          <div
            key={d.hour}
            className="flex-1 rounded-sm cursor-default"
            style={{
              height: `${Math.max((d.sessions / maxSessions) * 100, 3)}%`,
              backgroundColor: barColor(d.sessions),
            }}
            title={`${d.hour}시: ${d.sessions}세션`}
          />
        ))}
      </div>
      <div className="flex justify-between text-[9px] text-gray-400 mt-1">
        <span>0시</span><span>6시</span><span>12시</span><span>18시</span><span>24시</span>
      </div>
      {peak && (
        <div className="text-xs text-emerald-600 font-bold text-center mt-2">
          피크: {peak.hour}~{peak.hour + 1}시 ({peak.sessions}세션)
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add author-tool/src/features/analytics/components/
git commit -m "feat(author-tool): add analytics widget components (KPI, charts, tables)"
```

---

### Task 7: DatePresetBar + AnalyticsDashboard

**Files:**
- Create: `author-tool/src/features/analytics/components/DatePresetBar.tsx`
- Create: `author-tool/src/features/analytics/components/AnalyticsDashboard.tsx`

- [ ] **Step 1: Create DatePresetBar.tsx**

```tsx
import { usePresets } from '../hooks/useAnalytics';
import type { DateRange } from '../types/analytics.types';

interface Props {
  selected: DateRange;
  onSelect: (range: DateRange) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function DatePresetBar({ selected, onSelect, onRefresh, isRefreshing }: Props) {
  const { data: presets } = usePresets();

  const datePresets = presets?.dates ?? [];
  const seasonPresets = presets?.seasons ?? [];

  const isActive = (start: string, end: string) =>
    selected.startDate === start && selected.endDate === end;

  return (
    <div className="flex items-center gap-2 flex-wrap px-4 py-3 border-b border-gray-200">
      <span className="font-bold text-sm">📊 사이트 분석</span>
      <div className="flex gap-1 ml-auto">
        {datePresets.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect({ startDate: p.startDate, endDate: p.endDate })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              isActive(p.startDate, p.endDate)
                ? 'bg-emerald-600 text-white'
                : 'bg-white border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {p.name}
          </button>
        ))}
        {seasonPresets.length > 0 && (
          <>
            <span className="text-gray-300 mx-1">|</span>
            {seasonPresets.map((s) => (
              <button
                key={s.id}
                onClick={() => onSelect({ startDate: s.startDate, endDate: s.endDate })}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  isActive(s.startDate, s.endDate)
                    ? 'bg-amber-500 text-white'
                    : 'bg-amber-50 border border-amber-300 hover:bg-amber-100'
                }`}
              >
                🔥 {s.name}
              </button>
            ))}
          </>
        )}
      </div>
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        className="px-2.5 py-1.5 rounded-lg text-xs bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
      >
        {isRefreshing ? '...' : '↻'}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create AnalyticsDashboard.tsx**

```tsx
import { useState, useCallback } from 'react';
import { useDashboard, useRefreshDashboard } from '../hooks/useAnalytics';
import type { DateRange } from '../types/analytics.types';
import DatePresetBar from './DatePresetBar';
import KpiCards from './KpiCards';
import ChannelChart from './ChannelChart';
import TopPagesTable from './TopPagesTable';
import CampaignTable from './CampaignTable';
import DeviceChart from './DeviceChart';
import HourlyChart from './HourlyChart';

function getDefault7d(): DateRange {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 6);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: today.toISOString().split('T')[0],
  };
}

function Skeleton() {
  return <div className="bg-gray-100 rounded-xl h-40 animate-pulse" />;
}

function NotConfigured() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <div className="text-4xl mb-4">📊</div>
        <h2 className="text-lg font-bold mb-2">GA4 연동 필요</h2>
        <p className="text-sm text-gray-500 mb-4">
          사이트 분석을 보려면 Google Analytics 4를 연동해주세요.
        </p>
        <div className="text-left bg-gray-50 rounded-lg p-4 text-xs text-gray-600 space-y-1">
          <p>1. Google Cloud Console에서 서비스 계정 생성</p>
          <p>2. GA4 속성에 서비스 계정 뷰어 권한 추가</p>
          <p>3. <code className="bg-gray-200 px-1 rounded">.env</code>에 설정:</p>
          <pre className="bg-gray-200 p-2 rounded mt-1">
{`GA4_PROPERTY_ID=속성ID
GA4_SERVICE_ACCOUNT_KEY=./ga4-key.json`}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [range, setRange] = useState<DateRange>(getDefault7d);
  const { data, isLoading, error } = useDashboard(range.startDate, range.endDate);
  const refreshDashboard = useRefreshDashboard();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshDashboard();
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000); // 1s debounce
    }
  }, [refreshDashboard]);

  // GA4 not configured
  if (!isLoading && data === null) return <NotConfigured />;

  const isToday = range.startDate === range.endDate &&
    range.startDate === new Date().toISOString().split('T')[0];

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <DatePresetBar
        selected={range}
        onSelect={setRange}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <div className="p-4 space-y-3">
        {isToday && (
          <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            ⚠️ "오늘" 데이터는 GA4 처리 지연으로 불완전할 수 있습니다 (최대 24~48시간)
          </div>
        )}

        {data?.cachedAt && (
          <div className="text-[10px] text-gray-400 text-right">
            캐시: {new Date(data.cachedAt).toLocaleTimeString('ko-KR')}
          </div>
        )}

        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            데이터 로딩 실패: {(error as Error).message}
          </div>
        )}

        {isLoading ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[1,2,3,4].map(i => <Skeleton key={i} />)}
            </div>
            <div className="grid grid-cols-2 gap-3"><Skeleton /><Skeleton /></div>
            <div className="grid grid-cols-3 gap-3"><Skeleton /><Skeleton /><Skeleton /></div>
          </>
        ) : data ? (
          <>
            <KpiCards data={data.overview} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ChannelChart data={data.channels} />
              <TopPagesTable data={data.topPages} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <CampaignTable data={data.campaigns} />
              <DeviceChart data={data.devices} />
              <HourlyChart data={data.hourly} />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add author-tool/src/features/analytics/components/DatePresetBar.tsx author-tool/src/features/analytics/components/AnalyticsDashboard.tsx
git commit -m "feat(author-tool): add DatePresetBar and AnalyticsDashboard container"
```

---

### Task 8: Wire into app (store + sidebar + main layout)

**Files:**
- Modify: `author-tool/src/store/editor.store.ts`
- Modify: `author-tool/src/components/Sidebar.tsx`
- Modify: main layout file (App.tsx or equivalent)

- [ ] **Step 1: Add 'analytics' to ActiveView in editor.store.ts**

Change the `ActiveView` type to include `'analytics'`:
```typescript
type ActiveView = 'analytics' | 'dashboard' | 'exam' | 'question' | 'generator' | 'card-news' | 'note-card-news' | 'card-news-gallery' | 'notes' | 'content' | 'notes-editor';
```

Change the default `activeView` in the store's initial state from `'dashboard'` to `'analytics'`.

- [ ] **Step 2: Add analytics button to Sidebar.tsx**

In the sidebar header area (near the logo "기출노트 저작도구"), add a 📊 button:
```tsx
<button
  onClick={() => { setActiveView('analytics'); }}
  className={`p-1.5 rounded-lg text-sm ${activeView === 'analytics' ? 'bg-emerald-100 text-emerald-700' : 'hover:bg-gray-100 text-gray-500'}`}
  title="사이트 분석"
>
  📊
</button>
```

- [ ] **Step 3: Render AnalyticsDashboard in main layout**

In the main content area where `activeView` is switched (likely App.tsx or a layout component), add:
```tsx
import AnalyticsDashboard from './features/analytics/components/AnalyticsDashboard';

// In the view switch:
{activeView === 'analytics' && <AnalyticsDashboard />}
```

- [ ] **Step 4: Test manually**

Start the dev server, verify:
1. App loads with analytics dashboard as default view
2. "GA4 연동 필요" onboarding card shows (since no GA4 key yet)
3. 📊 button in sidebar toggles back to dashboard
4. Other tabs still work normally

- [ ] **Step 5: Commit**

```bash
git add author-tool/src/store/editor.store.ts author-tool/src/components/Sidebar.tsx author-tool/src/App.tsx
git commit -m "feat(author-tool): wire analytics dashboard as default home view"
```

---

## Chunk 3: Integration Test

### Task 9: End-to-end verification with GA4

- [ ] **Step 1: Set up Google Cloud credentials**

Follow the spec's Section 6 (사전 준비):
1. Create/select Google Cloud project
2. Enable "Google Analytics Data API"
3. Create service account → download JSON key
4. Add service account email as Viewer in GA4 property settings
5. Place key file at `author-tool/ga4-key.json`
6. Set `.env` values:
```
GA4_PROPERTY_ID=<your-property-id>
GA4_SERVICE_ACCOUNT_KEY=./ga4-key.json
```

- [ ] **Step 2: Test API endpoint directly**

```bash
curl "http://localhost:3001/api/analytics/presets"
# Expected: { success: true, data: { dates: [...], seasons: [...] } }

curl "http://localhost:3001/api/analytics/dashboard?start=2026-03-18&end=2026-03-25"
# Expected: { success: true, data: { overview: {...}, channels: [...], ... } }
```

- [ ] **Step 3: Test in browser**

Open the author tool in browser. Verify:
1. Dashboard loads with real GA4 data
2. KPI cards show numbers with change %
3. Channel chart renders with bars
4. Top pages table shows real paths
5. Campaign table shows UTM data (or "UTM 데이터 없음")
6. Device chart shows mobile/desktop split
7. Hourly chart shows 24 bars with peak indicator
8. Preset buttons switch date ranges and refetch
9. Season preset buttons appear and work
10. Refresh button clears cache and reloads
11. "오늘" shows delay warning

- [ ] **Step 4: Test error states**

1. Remove GA4_PROPERTY_ID from .env → restart → should show onboarding card
2. Set invalid property ID → should show error message in dashboard
3. Click refresh rapidly → should debounce (no rate limit errors)

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat(author-tool): GA4 analytics dashboard complete (Phase B)"
```
