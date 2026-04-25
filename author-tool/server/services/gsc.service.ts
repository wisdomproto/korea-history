import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

let authClient: InstanceType<typeof google.auth.GoogleAuth> | null = null;

function getAuth() {
  if (authClient) return authClient;
  const keyValue = config.ga4.serviceAccountKey;

  let credentials: { client_email: string; private_key: string };
  if (config.ga4.clientEmail && config.ga4.privateKey) {
    credentials = {
      client_email: config.ga4.clientEmail,
      private_key: config.ga4.privateKey.replace(/\\n/g, '\n'),
    };
  } else if (!keyValue) {
    throw new Error('GA4 service account not configured');
  } else if (keyValue.startsWith('{')) {
    const parsed = JSON.parse(keyValue);
    credentials = {
      client_email: parsed.client_email,
      private_key: parsed.private_key,
    };
  } else if (keyValue.endsWith('.json')) {
    const keyPath = path.isAbsolute(keyValue)
      ? keyValue
      : path.resolve(__dirname, '../../', keyValue);
    const parsed = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
    credentials = {
      client_email: parsed.client_email,
      private_key: parsed.private_key,
    };
  } else {
    const parsed = JSON.parse(Buffer.from(keyValue, 'base64').toString('utf-8'));
    credentials = {
      client_email: parsed.client_email,
      private_key: parsed.private_key,
    };
  }
  authClient = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
  return authClient;
}

export function isConfigured(): boolean {
  const hasSite = !!config.gsc.siteUrl;
  const hasCreds =
    !!config.ga4.serviceAccountKey ||
    !!(config.ga4.clientEmail && config.ga4.privateKey);
  return hasSite && hasCreds;
}

export function getServiceAccountEmail(): string | null {
  if (config.ga4.clientEmail) return config.ga4.clientEmail;
  const keyValue = config.ga4.serviceAccountKey;
  if (!keyValue) return null;
  try {
    if (keyValue.startsWith('{')) {
      return JSON.parse(keyValue).client_email ?? null;
    }
    if (keyValue.endsWith('.json')) {
      const keyPath = path.isAbsolute(keyValue)
        ? keyValue
        : path.resolve(__dirname, '../../', keyValue);
      return JSON.parse(fs.readFileSync(keyPath, 'utf-8')).client_email ?? null;
    }
    return JSON.parse(Buffer.from(keyValue, 'base64').toString('utf-8')).client_email ?? null;
  } catch {
    return null;
  }
}

export function getSiteUrl(): string {
  return config.gsc.siteUrl;
}

function getCacheTtl(startDate: string, endDate: string): number {
  const today = new Date().toISOString().split('T')[0];
  if (startDate === today && endDate === today) return 15 * 60 * 1000;
  return 60 * 60 * 1000;
}

interface GscApiRow {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
}

async function runQuery(
  siteUrl: string,
  startDate: string,
  endDate: string,
  dimensions: Array<'query' | 'page' | 'country' | 'device' | 'date'>,
  rowLimit: number = 50
): Promise<GscApiRow[]> {
  const auth = getAuth();
  const webmasters = google.webmasters({ version: 'v3', auth });
  const res = await webmasters.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions,
      rowLimit,
      dataState: 'all',
    },
  });
  return (res.data.rows as GscApiRow[] | undefined) ?? [];
}

export async function getSearchConsole(
  startDate: string,
  endDate: string
): Promise<SearchConsoleData> {
  const cacheKey = `gsc:${startDate}:${endDate}`;
  const cached = getCached<SearchConsoleData>(cacheKey);
  if (cached) return cached;

  const siteUrl = config.gsc.siteUrl;

  // GSC has ~2-3 day data lag. For ranges ending today, clamp to 3 days ago.
  const today = new Date().toISOString().split('T')[0];
  const adjustedEnd = endDate >= today
    ? (() => {
        const d = new Date();
        d.setDate(d.getDate() - 3);
        return d.toISOString().split('T')[0];
      })()
    : endDate;

  const [totalsRows, queryRows, pageRows] = await Promise.all([
    runQuery(siteUrl, startDate, adjustedEnd, [], 1),
    runQuery(siteUrl, startDate, adjustedEnd, ['query'], 50),
    runQuery(siteUrl, startDate, adjustedEnd, ['page'], 30),
  ]);

  const t = totalsRows[0] || {};
  const totals: GscTotals = {
    clicks: Math.round(t.clicks || 0),
    impressions: Math.round(t.impressions || 0),
    ctr: Math.round((t.ctr || 0) * 10000) / 100,
    position: Math.round((t.position || 0) * 10) / 10,
  };

  const queries: GscQueryRow[] = queryRows.map((r) => ({
    query: r.keys?.[0] || '',
    clicks: Math.round(r.clicks || 0),
    impressions: Math.round(r.impressions || 0),
    ctr: Math.round((r.ctr || 0) * 10000) / 100,
    position: Math.round((r.position || 0) * 10) / 10,
  }));

  const pages: GscPageRow[] = pageRows.map((r) => ({
    page: r.keys?.[0] || '',
    clicks: Math.round(r.clicks || 0),
    impressions: Math.round(r.impressions || 0),
    ctr: Math.round((r.ctr || 0) * 10000) / 100,
    position: Math.round((r.position || 0) * 10) / 10,
  }));

  const result: SearchConsoleData = {
    siteUrl,
    totals,
    queries,
    pages,
    cachedAt: new Date().toISOString(),
  };

  const ttl = getCacheTtl(startDate, endDate);
  if (ttl > 0) setCache(cacheKey, result, ttl);
  return result;
}
