// One-off GA4 + GSC snapshot for investor-deck / GA4 report refresh.
// Pulls last 30d + last 5d (since 2026-05-07) + previous-30d comparison.
// Output: author-tool/scripts/output/ga4-snapshot-{date}.json
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config as loadEnv } from 'dotenv';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { google } from 'googleapis';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, '../.env') });

const KEY_PATH = path.resolve(__dirname, '../ga4-key.json');
const PROPERTY_ID = process.env.GA4_PROPERTY_ID;
const SITE_URL = process.env.GSC_SITE_URL || 'sc-domain:gcnote.co.kr';

if (!PROPERTY_ID) { console.error('GA4_PROPERTY_ID not set'); process.exit(1); }

let key;
if (fs.existsSync(KEY_PATH)) {
  key = JSON.parse(fs.readFileSync(KEY_PATH, 'utf-8'));
} else if (process.env.GA4_CLIENT_EMAIL && process.env.GA4_PRIVATE_KEY) {
  key = {
    client_email: process.env.GA4_CLIENT_EMAIL,
    private_key: process.env.GA4_PRIVATE_KEY.replace(/\\n/g, '\n'),
  };
} else {
  console.error('No GA4 credentials (ga4-key.json or GA4_CLIENT_EMAIL+GA4_PRIVATE_KEY)');
  process.exit(1);
}

const ga = new BetaAnalyticsDataClient({ credentials: { client_email: key.client_email, private_key: key.private_key } });
const property = `properties/${PROPERTY_ID}`;

const auth = new google.auth.GoogleAuth({
  credentials: { client_email: key.client_email, private_key: key.private_key },
  scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
});
const wm = google.webmasters({ version: 'v3', auth });

function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]; }
function todayKST() { return new Date().toISOString().split('T')[0]; }

const today = todayKST();
const d30 = daysAgo(30);
const d60 = daysAgo(60);
const d31 = daysAgo(31);
const since57 = '2026-05-08'; // day after last report (5/7)
const yesterday = daysAgo(1);

console.log(`Pulling GA4 snapshot — today=${today}`);
console.log(`  Last 30d: ${d30} ~ ${today}`);
console.log(`  Prev 30d: ${d60} ~ ${d31}`);
console.log(`  Since report: ${since57} ~ ${today}`);

async function runReport(opts) { const [r] = await ga.runReport({ property, ...opts }); return r; }
function num(v) { return Number(v ?? 0); }

async function overview(start, end) {
  const r = await runReport({
    dateRanges: [{ startDate: start, endDate: end }],
    metrics: [
      { name: 'sessions' }, { name: 'totalUsers' }, { name: 'newUsers' },
      { name: 'screenPageViews' }, { name: 'averageSessionDuration' },
      { name: 'engagementRate' }, { name: 'bounceRate' },
    ],
  });
  const row = r.rows?.[0]?.metricValues ?? [];
  return {
    sessions: num(row[0]?.value),
    users: num(row[1]?.value),
    newUsers: num(row[2]?.value),
    pageViews: num(row[3]?.value),
    avgSessionDuration: Math.round(num(row[4]?.value)),
    engagementRate: Math.round(num(row[5]?.value) * 1000) / 10,
    bounceRate: Math.round(num(row[6]?.value) * 1000) / 10,
  };
}

async function daily(start, end) {
  const r = await runReport({
    dateRanges: [{ startDate: start, endDate: end }],
    dimensions: [{ name: 'date' }],
    metrics: [
      { name: 'sessions' }, { name: 'totalUsers' }, { name: 'newUsers' },
      { name: 'screenPageViews' }, { name: 'averageSessionDuration' },
    ],
    orderBys: [{ dimension: { dimensionName: 'date' } }],
  });
  return (r.rows ?? []).map(row => {
    const raw = row.dimensionValues?.[0]?.value ?? '';
    const date = raw.length === 8 ? `${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}` : raw;
    return {
      date,
      sessions: num(row.metricValues?.[0]?.value),
      users: num(row.metricValues?.[1]?.value),
      newUsers: num(row.metricValues?.[2]?.value),
      pageViews: num(row.metricValues?.[3]?.value),
      avgSessionDuration: Math.round(num(row.metricValues?.[4]?.value)),
    };
  });
}

async function channels(start, end) {
  const r = await runReport({
    dateRanges: [{ startDate: start, endDate: end }],
    dimensions: [{ name: 'sessionDefaultChannelGroup' }],
    metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 10,
  });
  const total = (r.rows ?? []).reduce((s, row) => s + num(row.metricValues?.[0]?.value), 0);
  return (r.rows ?? []).map(row => ({
    channel: row.dimensionValues?.[0]?.value ?? 'Unknown',
    sessions: num(row.metricValues?.[0]?.value),
    users: num(row.metricValues?.[1]?.value),
    percentage: total > 0 ? Math.round(num(row.metricValues?.[0]?.value) / total * 1000) / 10 : 0,
  }));
}

async function topPages(start, end, limit = 15) {
  const r = await runReport({
    dateRanges: [{ startDate: start, endDate: end }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }, { name: 'sessions' }, { name: 'engagementRate' }, { name: 'bounceRate' }],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit,
  });
  return (r.rows ?? []).map(row => ({
    path: row.dimensionValues?.[0]?.value ?? '/',
    pageViews: num(row.metricValues?.[0]?.value),
    sessions: num(row.metricValues?.[1]?.value),
    engagementRate: Math.round(num(row.metricValues?.[2]?.value) * 1000) / 10,
    bounceRate: Math.round(num(row.metricValues?.[3]?.value) * 1000) / 10,
  }));
}

async function devices(start, end) {
  const r = await runReport({
    dateRanges: [{ startDate: start, endDate: end }],
    dimensions: [{ name: 'deviceCategory' }],
    metrics: [{ name: 'sessions' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
  });
  const total = (r.rows ?? []).reduce((s, row) => s + num(row.metricValues?.[0]?.value), 0);
  return (r.rows ?? []).map(row => ({
    device: row.dimensionValues?.[0]?.value ?? 'Unknown',
    sessions: num(row.metricValues?.[0]?.value),
    percentage: total > 0 ? Math.round(num(row.metricValues?.[0]?.value) / total * 1000) / 10 : 0,
  }));
}

async function landingPages(start, end, limit = 12) {
  const r = await runReport({
    dateRanges: [{ startDate: start, endDate: end }],
    dimensions: [{ name: 'landingPagePlusQueryString' }],
    metrics: [{ name: 'sessions' }, { name: 'engagementRate' }, { name: 'bounceRate' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit,
  });
  return (r.rows ?? []).map(row => ({
    path: row.dimensionValues?.[0]?.value ?? '/',
    sessions: num(row.metricValues?.[0]?.value),
    engagementRate: Math.round(num(row.metricValues?.[1]?.value) * 1000) / 10,
    bounceRate: Math.round(num(row.metricValues?.[2]?.value) * 1000) / 10,
  }));
}

async function sources(start, end, limit = 15) {
  const r = await runReport({
    dateRanges: [{ startDate: start, endDate: end }],
    dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
    metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit,
  });
  return (r.rows ?? []).map(row => ({
    source: row.dimensionValues?.[0]?.value ?? '(direct)',
    medium: row.dimensionValues?.[1]?.value ?? '(none)',
    sessions: num(row.metricValues?.[0]?.value),
    users: num(row.metricValues?.[1]?.value),
  }));
}

async function gscData(start, end) {
  // Top queries
  const queries = await wm.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: { startDate: start, endDate: end, dimensions: ['query'], rowLimit: 30, dataState: 'all' },
  });
  const totals = await wm.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: { startDate: start, endDate: end, dimensions: [], rowLimit: 1, dataState: 'all' },
  });
  return {
    totals: totals.data.rows?.[0] ?? null,
    queries: queries.data.rows ?? [],
  };
}

const result = {
  generatedAt: new Date().toISOString(),
  today,
  ranges: { last30: { start: d30, end: today }, prev30: { start: d60, end: d31 }, sinceLastReport: { start: since57, end: today } },
  overview: {
    last30: await overview(d30, today),
    prev30: await overview(d60, d31),
    sinceReport: await overview(since57, today),
    last7: await overview(daysAgo(7), today),
  },
  daily14: await daily(daysAgo(14), today),
  channels30: await channels(d30, today),
  channelsPrev30: await channels(d60, d31),
  channelsSinceReport: await channels(since57, today),
  topPages30: await topPages(d30, today, 20),
  devices30: await devices(d30, today),
  landingPages30: await landingPages(d30, today, 15),
  sources30: await sources(d30, today, 20),
};

// GSC — may fail if creds don't have webmasters access
try {
  const gscEnd = daysAgo(3); // GSC has 3-day lag
  result.gsc = {
    last30: await gscData(daysAgo(33), gscEnd),
    prev30: await gscData(daysAgo(63), daysAgo(34)),
  };
} catch (err) {
  console.warn('GSC pull failed:', err.message);
  result.gsc = null;
}

const outDir = path.resolve(__dirname, 'output');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `ga4-snapshot-${today}.json`);
fs.writeFileSync(outFile, JSON.stringify(result, null, 2), 'utf-8');
console.log(`\n✓ Saved: ${outFile}`);
console.log(`\n── Overview ──`);
console.log(`Last 30d: users=${result.overview.last30.users} pv=${result.overview.last30.pageViews} sessions=${result.overview.last30.sessions} avg=${(result.overview.last30.avgSessionDuration/60).toFixed(1)}min`);
console.log(`Prev 30d: users=${result.overview.prev30.users} pv=${result.overview.prev30.pageViews}`);
console.log(`Since 5/8: users=${result.overview.sinceReport.users} pv=${result.overview.sinceReport.pageViews}`);
console.log(`Last 7d:  users=${result.overview.last7.users} pv=${result.overview.last7.pageViews}`);
console.log(`\n── Channels (30d) ──`);
result.channels30.forEach(c => console.log(`  ${c.channel.padEnd(20)} ${String(c.sessions).padStart(6)} sessions (${c.percentage}%)`));
console.log(`\n── Daily (last 14d) ──`);
result.daily14.forEach(d => console.log(`  ${d.date}  users=${String(d.users).padStart(4)}  pv=${String(d.pageViews).padStart(5)}  sessions=${String(d.sessions).padStart(4)}`));
