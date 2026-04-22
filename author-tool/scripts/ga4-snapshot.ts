import { BetaAnalyticsDataClient } from '@google-analytics/data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const propertyId = process.env.GA4_PROPERTY_ID!;
const keyPath = path.resolve(__dirname, '../', process.env.GA4_SERVICE_ACCOUNT_KEY || './ga4-key.json');
const credentials = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
const client = new BetaAnalyticsDataClient({ credentials });
const property = `properties/${propertyId}`;

async function overview(start: string, end: string, label: string) {
  const [resp] = await client.runReport({
    property,
    dateRanges: [{ startDate: start, endDate: end }],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'activeUsers' },
      { name: 'newUsers' },
      { name: 'screenPageViews' },
      { name: 'averageSessionDuration' },
      { name: 'bounceRate' },
      { name: 'engagementRate' },
    ],
  });
  const row = resp.rows?.[0]?.metricValues || [];
  const get = (i: number) => parseFloat(row[i]?.value || '0');
  const data = {
    label,
    period: `${start} ~ ${end}`,
    sessions: get(0),
    totalUsers: get(1),
    activeUsers: get(2),
    newUsers: get(3),
    pageViews: get(4),
    avgSessionDuration: get(5),
    bounceRate: get(6),
    engagementRate: get(7),
  };
  console.log(`\n=== ${label} (${start} ~ ${end}) ===`);
  console.log(`Sessions         : ${data.sessions.toLocaleString()}`);
  console.log(`Total Users      : ${data.totalUsers.toLocaleString()}`);
  console.log(`Active Users     : ${data.activeUsers.toLocaleString()}`);
  console.log(`New Users        : ${data.newUsers.toLocaleString()}`);
  console.log(`Page Views       : ${data.pageViews.toLocaleString()}`);
  console.log(`Avg Session Dur  : ${data.avgSessionDuration.toFixed(1)}s (${(data.avgSessionDuration/60).toFixed(2)}min)`);
  console.log(`Bounce Rate      : ${(data.bounceRate*100).toFixed(1)}%`);
  console.log(`Engagement Rate  : ${(data.engagementRate*100).toFixed(1)}%`);
  const days = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;
  console.log(`Days             : ${days}`);
  console.log(`Users/day (avg)  : ${(data.totalUsers/days).toFixed(1)}`);
  console.log(`PV/day  (avg)    : ${(data.pageViews/days).toFixed(1)}`);
  console.log(`PV per user      : ${(data.pageViews/data.totalUsers).toFixed(2)}`);
  return data;
}

async function daily(start: string, end: string) {
  const [resp] = await client.runReport({
    property,
    dateRanges: [{ startDate: start, endDate: end }],
    dimensions: [{ name: 'date' }],
    metrics: [
      { name: 'totalUsers' },
      { name: 'screenPageViews' },
      { name: 'averageSessionDuration' },
    ],
    orderBys: [{ dimension: { dimensionName: 'date' } }],
  });
  console.log(`\n=== Daily (${start} ~ ${end}) ===`);
  console.log('date        users    pv     avgDur');
  for (const r of resp.rows || []) {
    const d = r.dimensionValues?.[0]?.value || '';
    const u = r.metricValues?.[0]?.value || '0';
    const pv = r.metricValues?.[1]?.value || '0';
    const dur = parseFloat(r.metricValues?.[2]?.value || '0');
    console.log(`${d}  ${u.padStart(5)}  ${pv.padStart(5)}  ${dur.toFixed(1)}s`);
  }
}

async function topPages(start: string, end: string) {
  const [resp] = await client.runReport({
    property,
    dateRanges: [{ startDate: start, endDate: end }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }, { name: 'totalUsers' }],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 15,
  });
  console.log(`\n=== Top Pages (${start} ~ ${end}) ===`);
  for (const r of resp.rows || []) {
    const p = r.dimensionValues?.[0]?.value || '';
    const pv = r.metricValues?.[0]?.value || '0';
    const u = r.metricValues?.[1]?.value || '0';
    console.log(`${pv.padStart(6)} PV | ${u.padStart(5)} users | ${p}`);
  }
}

async function devices(start: string, end: string) {
  const [resp] = await client.runReport({
    property,
    dateRanges: [{ startDate: start, endDate: end }],
    dimensions: [{ name: 'deviceCategory' }],
    metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
  });
  console.log(`\n=== Devices (${start} ~ ${end}) ===`);
  for (const r of resp.rows || []) {
    const d = r.dimensionValues?.[0]?.value || '';
    const s = r.metricValues?.[0]?.value || '0';
    const u = r.metricValues?.[1]?.value || '0';
    console.log(`${d.padEnd(12)} sessions=${s} users=${u}`);
  }
}

async function channels(start: string, end: string) {
  const [resp] = await client.runReport({
    property,
    dateRanges: [{ startDate: start, endDate: end }],
    dimensions: [{ name: 'sessionDefaultChannelGroup' }],
    metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
  });
  console.log(`\n=== Channels (${start} ~ ${end}) ===`);
  for (const r of resp.rows || []) {
    const c = r.dimensionValues?.[0]?.value || '';
    const s = r.metricValues?.[0]?.value || '0';
    const u = r.metricValues?.[1]?.value || '0';
    console.log(`${c.padEnd(22)} sessions=${s.padStart(5)} users=${u.padStart(5)}`);
  }
}

(async () => {
  const today = new Date();
  const end = today.toISOString().split('T')[0];
  const d30 = new Date(today); d30.setDate(d30.getDate() - 29);
  const d7 = new Date(today); d7.setDate(d7.getDate() - 6);
  const start30 = d30.toISOString().split('T')[0];
  const start7 = d7.toISOString().split('T')[0];

  await overview(start30, end, 'Last 30 Days');
  await overview(start7, end, 'Last 7 Days');
  await daily(start7, end);
  await topPages(start30, end);
  await devices(start30, end);
  await channels(start30, end);
})().catch((e) => { console.error(e); process.exit(1); });
