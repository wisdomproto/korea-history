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

const today = new Date();
const end = today.toISOString().split('T')[0];
const d30 = new Date(today); d30.setDate(d30.getDate() - 29);
const start = d30.toISOString().split('T')[0];

async function eventCounts() {
  const [resp] = await client.runReport({
    property,
    dateRanges: [{ startDate: start, endDate: end }],
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
  });
  console.log(`\n=== All Events (${start} ~ ${end}) ===`);
  for (const r of resp.rows || []) {
    const name = r.dimensionValues?.[0]?.value || '';
    const c = r.metricValues?.[0]?.value || '0';
    const u = r.metricValues?.[1]?.value || '0';
    console.log(`${name.padEnd(28)} count=${c.padStart(6)}  users=${u.padStart(5)}`);
  }
}

async function pageByGroup() {
  const groups = {
    '메인':      (p: string) => p === '/',
    '시험목록':   (p: string) => p === '/exam',
    '시험회차':   (p: string) => /^\/exam\/\d+$/.test(p),
    '문제풀이':   (p: string) => /^\/exam\/\d+\/\d+/.test(p),
    '맞춤학습입구': (p: string) => p === '/study',
    '맞춤학습설정': (p: string) => p === '/study/custom',
    '키워드학습': (p: string) => p === '/study/keyword',
    '학습세션':   (p: string) => p === '/study/session',
    '학습결과':   (p: string) => p.startsWith('/study/result'),
    '요약노트목록': (p: string) => p === '/notes',
    '요약노트상세': (p: string) => /^\/notes\/s\d/.test(p),
    '오답노트':   (p: string) => p.startsWith('/wrong-answers'),
    '내기록':     (p: string) => p.startsWith('/my-record'),
    '게시판':     (p: string) => p.startsWith('/board'),
  };
  const [resp] = await client.runReport({
    property,
    dateRanges: [{ startDate: start, endDate: end }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }, { name: 'totalUsers' }, { name: 'averageSessionDuration' }, { name: 'userEngagementDuration' }, { name: 'sessions' }],
    limit: 1000,
  });
  const totals = Object.fromEntries(Object.keys(groups).map(k => [k, { pv: 0, users: 0, engSec: 0, sessions: 0, pageCount: 0 }]));
  let unclassified = { pv: 0, users: 0 };
  for (const r of resp.rows || []) {
    const p = r.dimensionValues?.[0]?.value || '';
    const pv = parseFloat(r.metricValues?.[0]?.value || '0');
    const u = parseFloat(r.metricValues?.[1]?.value || '0');
    const eng = parseFloat(r.metricValues?.[3]?.value || '0');
    const s = parseFloat(r.metricValues?.[4]?.value || '0');
    let matched = false;
    for (const [k, fn] of Object.entries(groups)) {
      if (fn(p)) {
        totals[k].pv += pv;
        totals[k].users += u;
        totals[k].engSec += eng;
        totals[k].sessions += s;
        totals[k].pageCount += 1;
        matched = true;
        break;
      }
    }
    if (!matched) { unclassified.pv += pv; unclassified.users += u; }
  }
  console.log(`\n=== Page Group Summary (${start} ~ ${end}) ===`);
  console.log('group              PV    Sessions  UniqUsers(sum)  AvgEngPerPV(s)');
  for (const [k, v] of Object.entries(totals)) {
    const avgEng = v.pv > 0 ? v.engSec / v.pv : 0;
    console.log(`${k.padEnd(18)} ${String(v.pv).padStart(6)}  ${String(v.sessions).padStart(8)}  ${String(v.users).padStart(14)}  ${avgEng.toFixed(1)}`);
  }
  console.log(`(unclassified PV: ${unclassified.pv})`);
  return totals;
}

async function examPageEngagement() {
  // look at individual exam/question pages to see depth
  const [resp] = await client.runReport({
    property,
    dateRanges: [{ startDate: start, endDate: end }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }, { name: 'totalUsers' }, { name: 'userEngagementDuration' }, { name: 'sessions' }],
    dimensionFilter: {
      filter: {
        fieldName: 'pagePath',
        stringFilter: { matchType: 'BEGINS_WITH', value: '/exam/' },
      },
    },
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 30,
  });
  console.log(`\n=== Top Exam Pages engagement (${start} ~ ${end}) ===`);
  console.log('page                         PV   users  engPerPV(s)');
  for (const r of resp.rows || []) {
    const p = r.dimensionValues?.[0]?.value || '';
    const pv = parseFloat(r.metricValues?.[0]?.value || '0');
    const u = parseFloat(r.metricValues?.[1]?.value || '0');
    const eng = parseFloat(r.metricValues?.[2]?.value || '0');
    const avgEng = pv > 0 ? eng / pv : 0;
    console.log(`${p.padEnd(28)} ${String(pv).padStart(4)}  ${String(u).padStart(5)}  ${avgEng.toFixed(1)}`);
  }
}

async function entryExit() {
  // Landing page (session entry) vs exit
  const [landing] = await client.runReport({
    property,
    dateRanges: [{ startDate: start, endDate: end }],
    dimensions: [{ name: 'landingPage' }],
    metrics: [{ name: 'sessions' }, { name: 'bounceRate' }, { name: 'engagementRate' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 10,
  });
  console.log(`\n=== Landing pages (session entry) ===`);
  console.log('page                       sessions  bounce%  engage%');
  for (const r of landing.rows || []) {
    const p = r.dimensionValues?.[0]?.value || '';
    const s = r.metricValues?.[0]?.value || '0';
    const b = parseFloat(r.metricValues?.[1]?.value || '0');
    const e = parseFloat(r.metricValues?.[2]?.value || '0');
    console.log(`${p.padEnd(26)} ${s.padStart(8)}  ${(b*100).toFixed(1).padStart(5)}%  ${(e*100).toFixed(1).padStart(5)}%`);
  }
}

async function pvPerSession() {
  // sessions & pv per session
  const [resp] = await client.runReport({
    property,
    dateRanges: [{ startDate: start, endDate: end }],
    metrics: [
      { name: 'sessions' },
      { name: 'screenPageViews' },
      { name: 'screenPageViewsPerSession' },
      { name: 'userEngagementDuration' },
      { name: 'engagedSessions' },
    ],
  });
  const row = resp.rows?.[0]?.metricValues || [];
  console.log(`\n=== Session quality (${start} ~ ${end}) ===`);
  console.log(`sessions             : ${row[0]?.value}`);
  console.log(`screenPageViews      : ${row[1]?.value}`);
  console.log(`pageViewsPerSession  : ${parseFloat(row[2]?.value || '0').toFixed(2)}`);
  console.log(`engagementDuration   : ${row[3]?.value}s`);
  console.log(`engagedSessions      : ${row[4]?.value}`);
}

async function outboundClicks() {
  // Check click event with link_domain dimension for outbound (YouTube, etc)
  const [resp] = await client.runReport({
    property,
    dateRanges: [{ startDate: start, endDate: end }],
    dimensions: [{ name: 'eventName' }, { name: 'linkDomain' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        stringFilter: { matchType: 'EXACT', value: 'click' },
      },
    },
    limit: 30,
  });
  console.log(`\n=== Outbound Click Destinations ===`);
  for (const r of resp.rows || []) {
    const name = r.dimensionValues?.[0]?.value || '';
    const dom = r.dimensionValues?.[1]?.value || '(none)';
    const c = r.metricValues?.[0]?.value || '0';
    console.log(`${name.padEnd(12)} ${dom.padEnd(32)} ${c.padStart(5)}`);
  }
}

async function scrollDepth() {
  // scroll event as a proxy for deep reading (GA4 default fires at 90%)
  const [resp] = await client.runReport({
    property,
    dateRanges: [{ startDate: start, endDate: end }],
    dimensions: [{ name: 'pagePath' }, { name: 'eventName' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        stringFilter: { matchType: 'EXACT', value: 'scroll' },
      },
    },
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
    limit: 15,
  });
  console.log(`\n=== Scroll (90%) by page ===`);
  for (const r of resp.rows || []) {
    const p = r.dimensionValues?.[0]?.value || '';
    const c = r.metricValues?.[0]?.value || '0';
    console.log(`${p.padEnd(35)} ${c.padStart(5)} scrolls`);
  }
}

async function videoEvents() {
  // YouTube-enhanced measurement video events
  const [resp] = await client.runReport({
    property,
    dateRanges: [{ startDate: start, endDate: end }],
    dimensions: [{ name: 'eventName' }, { name: 'videoTitle' }, { name: 'videoProvider' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        inListFilter: { values: ['video_start', 'video_progress', 'video_complete'] },
      },
    },
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
    limit: 20,
  });
  console.log(`\n=== Video Events ===`);
  if (!resp.rows?.length) {
    console.log('(no video events — YouTube enhanced measurement may be off, or autoplay blocked)');
    return;
  }
  for (const r of resp.rows) {
    const n = r.dimensionValues?.[0]?.value || '';
    const t = (r.dimensionValues?.[1]?.value || '(none)').slice(0, 35);
    const p = r.dimensionValues?.[2]?.value || '';
    const c = r.metricValues?.[0]?.value || '0';
    console.log(`${n.padEnd(16)} ${p.padEnd(10)} ${t.padEnd(36)} ${c.padStart(5)}`);
  }
}

(async () => {
  await eventCounts();
  await pvPerSession();
  await pageByGroup();
  await examPageEngagement();
  await entryExit();
  await outboundClicks();
  await scrollDepth();
  await videoEvents();
})().catch((e) => { console.error(e); process.exit(1); });
