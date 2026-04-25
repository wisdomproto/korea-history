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
const d30 = new Date(today);
d30.setDate(d30.getDate() - 29);
const start = d30.toISOString().split('T')[0];

console.log(`\n=== GA4 데이터 (${start} ~ ${end}, 30일) ===\n`);

async function videoEvents() {
  console.log('▶️ YouTube 이벤트 총계');
  const [totals] = await client.runReport({
    property,
    dateRanges: [{ startDate: start, endDate: end }],
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        inListFilter: { values: ['video_play', 'video_complete', 'video_start', 'video_progress'] },
      },
    },
  });
  for (const r of totals.rows || []) {
    const name = r.dimensionValues?.[0]?.value || '';
    const c = r.metricValues?.[0]?.value || '0';
    const u = r.metricValues?.[1]?.value || '0';
    console.log(`  ${name.padEnd(20)} count=${c.padStart(6)}  users=${u.padStart(5)}`);
  }

  console.log('\n▶️ 영역별 (surface 커스텀 디멘션)');
  try {
    const [bySurface] = await client.runReport({
      property,
      dateRanges: [{ startDate: start, endDate: end }],
      dimensions: [{ name: 'eventName' }, { name: 'customEvent:surface' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          inListFilter: { values: ['video_play', 'video_complete'] },
        },
      },
    });
    for (const r of bySurface.rows || []) {
      const name = r.dimensionValues?.[0]?.value || '';
      const surface = r.dimensionValues?.[1]?.value || '(not set)';
      const c = r.metricValues?.[0]?.value || '0';
      console.log(`  ${name.padEnd(18)} surface=${surface.padEnd(15)} count=${c.padStart(6)}`);
    }
  } catch (err) {
    console.log('  ⚠️  커스텀 디멘션 "surface" 미등록 — GA4 Admin에서 등록 필요');
  }

  console.log('\n▶️ 인기 영상 TOP 10 (video_id 커스텀 디멘션)');
  try {
    const [byVideo] = await client.runReport({
      property,
      dateRanges: [{ startDate: start, endDate: end }],
      dimensions: [
        { name: 'eventName' },
        { name: 'customEvent:video_id' },
        { name: 'customEvent:video_title' },
      ],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          stringFilter: { matchType: 'EXACT', value: 'video_play' },
        },
      },
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit: 10,
    });
    for (const r of byVideo.rows || []) {
      const vid = r.dimensionValues?.[1]?.value || '';
      const title = r.dimensionValues?.[2]?.value || '';
      const c = r.metricValues?.[0]?.value || '0';
      console.log(`  ${vid.padEnd(15)} ${(title || '(title 미수집)').slice(0, 40).padEnd(42)} plays=${c.padStart(5)}`);
    }
  } catch (err) {
    console.log('  ⚠️  커스텀 디멘션 "video_id"/"video_title" 미등록');
  }
}

async function keywords() {
  console.log('\n🔎 유입 검색어 (sessionManualTerm)');
  const [res] = await client.runReport({
    property,
    dateRanges: [{ startDate: start, endDate: end }],
    dimensions: [{ name: 'sessionManualTerm' }, { name: 'sessionSource' }],
    metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 30,
  });
  const rows = (res.rows || []).filter((r) => {
    const t = r.dimensionValues?.[0]?.value || '';
    return t && t !== '(not set)' && t !== '(none)';
  });
  if (rows.length === 0) {
    console.log('  (없음) — Google/Naver 유기적 검색어는 대부분 "(not set)"로 비공개 처리됩니다.');
    console.log('  → Search Console 연동이 필요합니다.');
  } else {
    for (const r of rows) {
      const term = r.dimensionValues?.[0]?.value || '';
      const src = r.dimensionValues?.[1]?.value || '';
      const s = r.metricValues?.[0]?.value || '0';
      const u = r.metricValues?.[1]?.value || '0';
      console.log(`  ${src.padEnd(12)} ${term.slice(0, 40).padEnd(42)} sessions=${s.padStart(4)} users=${u.padStart(4)}`);
    }
  }

  console.log('\n🔎 Organic 검색 유입 요약 (channel=Organic Search)');
  const [res2] = await client.runReport({
    property,
    dateRanges: [{ startDate: start, endDate: end }],
    dimensions: [{ name: 'sessionSource' }, { name: 'sessionDefaultChannelGroup' }],
    metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 15,
  });
  for (const r of res2.rows || []) {
    const src = r.dimensionValues?.[0]?.value || '';
    const ch = r.dimensionValues?.[1]?.value || '';
    if (!ch.toLowerCase().includes('organic')) continue;
    const s = r.metricValues?.[0]?.value || '0';
    const u = r.metricValues?.[1]?.value || '0';
    console.log(`  ${src.padEnd(20)} sessions=${s.padStart(5)} users=${u.padStart(5)}`);
  }
}

(async () => {
  try {
    await videoEvents();
    await keywords();
    console.log('\n✅ 완료');
  } catch (err) {
    console.error('❌ 실패:', err);
    process.exit(1);
  }
})();
