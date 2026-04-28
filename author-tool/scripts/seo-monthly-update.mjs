// Monthly SEO snapshot — pulls GSC + Naver keyword data, generates digest with MoM delta.
// Run: cd author-tool && npm run seo:monthly
// Or set Windows Task Scheduler / Railway cron (매월 1일 09:00 KST)
//
// Outputs:
//   _research/seo-monthly/{YYYY-MM}/snapshot.json   — raw GSC + keyword data
//   _research/seo-monthly/{YYYY-MM}/digest.md       — human-readable summary with deltas
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import { config as loadEnv } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../');
loadEnv({ path: path.resolve(__dirname, '../.env') });

const KEY_PATH = path.resolve(__dirname, '../ga4-key.json');
const LICENSE = process.env.NAVER_API_LICENSE_KEY;
const SECRET = process.env.NAVER_API_SECRET_KEY;
const CUSTOMER = process.env.NAVER_API_CUSTOMER_ID;
const SITE_URL = process.env.GSC_SITE_URL || 'sc-domain:gcnote.co.kr';

if (!fs.existsSync(KEY_PATH)) {
  console.error('ga4-key.json not found at', KEY_PATH);
  process.exit(1);
}

// Top 26 golden keywords from § 06 of seo-strategy.html (validated 2026-04-28)
const GOLDEN_KEYWORDS = [
  // Top 10 P0
  '병자호란', '훈민정음', '대동법', '6월민주항쟁', '경국대전',
  '대한제국', '5.18', '균역법', '노비안검법', '세종대왕 업적',
  // P1 14
  '환국', '정조 업적', '광해군 업적', '광무개혁', '발해 멸망',
  '성종 업적', '음서제', '후삼국통일', '광종 업적', '흥선대원군 정책',
  '한능검 77회 답지', '광해군 평가', '임진왜란 결과', '오일팔',
  // Headterms (track even if defensive)
  '한능검', '한국사능력검정시험',
];

const now = new Date();
const yyyy = now.getFullYear();
const mm = String(now.getMonth() + 1).padStart(2, '0');
const monthDir = path.join(ROOT, '_research', 'seo-monthly', `${yyyy}-${mm}`);
fs.mkdirSync(monthDir, { recursive: true });

console.log(`SEO Monthly Snapshot — ${yyyy}-${mm}`);
console.log(`Output: ${monthDir}\n`);

// ─── 1. GSC pull ─────────────────────────────────────────────────────
const key = JSON.parse(fs.readFileSync(KEY_PATH, 'utf-8'));
const auth = new google.auth.GoogleAuth({
  credentials: { client_email: key.client_email, private_key: key.private_key },
  scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
});
const wm = google.webmasters({ version: 'v3', auth });

function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

async function gscQuery(start, end, dims, limit = 1000) {
  const res = await wm.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: { startDate: start, endDate: end, dimensions: dims, rowLimit: limit, dataState: 'all' },
  });
  return res.data.rows ?? [];
}

const endDate = isoDaysAgo(3);
const start30 = isoDaysAgo(33);
const start60 = isoDaysAgo(63);  // for prev month comparison

console.log('[1/3] Pulling GSC...');
const [totals30, queries30, pages30, totalsPrev30] = await Promise.all([
  gscQuery(start30, endDate, [], 1),
  gscQuery(start30, endDate, ['query'], 1000),
  gscQuery(start30, endDate, ['page'], 200),
  gscQuery(start60, start30, [], 1),
]);

const t30 = totals30[0] || {};
const tprev = totalsPrev30[0] || {};
console.log(`  ✓ 30d: ${Math.round(t30.clicks||0)} clicks, ${Math.round(t30.impressions||0)} imps, ${queries30.length} queries`);
console.log(`  ✓ Prev 30d: ${Math.round(tprev.clicks||0)} clicks, ${Math.round(tprev.impressions||0)} imps`);

// ─── 2. Naver keyword re-validation ──────────────────────────────────
console.log('\n[2/3] Validating golden keywords (Naver)...');

async function naverFetch(keywords) {
  if (!LICENSE || !SECRET || !CUSTOMER) {
    console.warn('  ! Naver API keys not set — skipping validation');
    return [];
  }
  const ts = String(Date.now());
  const apiPath = '/keywordstool';
  const sig = crypto.createHmac('sha256', SECRET).update(`${ts}.GET.${apiPath}`).digest('base64');
  const cleaned = keywords.map(k => k.trim().replace(/\s+/g, ''));
  const url = `https://api.naver.com${apiPath}?hintKeywords=${cleaned.map(encodeURIComponent).join(',')}&showDetail=1`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'X-Timestamp': ts, 'X-API-KEY': LICENSE, 'X-Customer': CUSTOMER, 'X-Signature': sig },
  });
  if (!res.ok) {
    return [];
  }
  const data = await res.json();
  return data.keywordList ?? [];
}

const norm = s => (s ?? '').toString().trim().replace(/\s+/g, '');
const num = v => typeof v === 'number' ? v : parseInt(String(v), 10) || 0;

const keywordResults = [];
// Single-keyword queries to avoid batch failures (special-char keywords)
for (const kw of GOLDEN_KEYWORDS) {
  const rows = await naverFetch([kw]);
  const exact = rows.find(r => norm(r.relKeyword) === norm(kw));
  if (exact) {
    const total = num(exact.monthlyPcQcCnt) + num(exact.monthlyMobileQcCnt);
    keywordResults.push({
      keyword: kw,
      volume: total,
      competition: exact.compIdx ?? '낮음',
      pcCtr: exact.monthlyAvePcCtr ?? 0,
      mobileCtr: exact.monthlyAveMobileCtr ?? 0,
    });
  } else {
    keywordResults.push({ keyword: kw, volume: null, competition: null, status: 'NO_DATA' });
  }
  await new Promise(r => setTimeout(r, 250));
}
console.log(`  ✓ ${keywordResults.filter(r => r.volume !== null).length}/${keywordResults.length} keywords matched`);

// ─── 3. Save snapshot + generate digest ──────────────────────────────
console.log('\n[3/3] Generating digest...');

const snapshot = {
  month: `${yyyy}-${mm}`,
  pulledAt: new Date().toISOString(),
  gsc: {
    range: { start: start30, end: endDate },
    rangePrev: { start: start60, end: start30 },
    totals: {
      clicks: Math.round(t30.clicks || 0),
      impressions: Math.round(t30.impressions || 0),
      ctr: Math.round((t30.ctr || 0) * 10000) / 100,
      position: Math.round((t30.position || 0) * 10) / 10,
    },
    totalsPrev: {
      clicks: Math.round(tprev.clicks || 0),
      impressions: Math.round(tprev.impressions || 0),
      ctr: Math.round((tprev.ctr || 0) * 10000) / 100,
      position: Math.round((tprev.position || 0) * 10) / 10,
    },
    queries: queries30.map(r => ({
      query: r.keys?.[0],
      clicks: Math.round(r.clicks || 0),
      impressions: Math.round(r.impressions || 0),
      ctr: Math.round((r.ctr || 0) * 10000) / 100,
      position: Math.round((r.position || 0) * 10) / 10,
    })),
    pages: pages30.map(r => ({
      page: r.keys?.[0],
      clicks: Math.round(r.clicks || 0),
      impressions: Math.round(r.impressions || 0),
      ctr: Math.round((r.ctr || 0) * 10000) / 100,
      position: Math.round((r.position || 0) * 10) / 10,
    })),
  },
  keywords: keywordResults,
};

fs.writeFileSync(path.join(monthDir, 'snapshot.json'), JSON.stringify(snapshot, null, 2));

// ── Look up previous month for MoM delta ──
const prevMonth = (() => {
  const d = new Date(now);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
})();
const prevSnapshotPath = path.join(ROOT, '_research', 'seo-monthly', prevMonth, 'snapshot.json');
let prev = null;
if (fs.existsSync(prevSnapshotPath)) {
  prev = JSON.parse(fs.readFileSync(prevSnapshotPath, 'utf-8'));
}

const delta = (cur, prv) => {
  if (prv === null || prv === 0) return cur > 0 ? '+∞' : '0';
  const pct = Math.round(((cur - prv) / prv) * 1000) / 10;
  return `${pct >= 0 ? '+' : ''}${pct}%`;
};

const lines = [];
lines.push(`# SEO Monthly Snapshot — ${yyyy}-${mm}`);
lines.push(``);
lines.push(`**Generated**: ${new Date().toISOString()}`);
lines.push(`**Site**: ${SITE_URL}`);
lines.push(``);
lines.push(`## 1. GSC KPI (last 30 days vs prev 30)`);
lines.push(``);
lines.push(`| Metric | Current | Previous | Δ |`);
lines.push(`|---|---|---|---|`);
const ts30 = snapshot.gsc.totals;
const tsprev = snapshot.gsc.totalsPrev;
lines.push(`| Clicks | ${ts30.clicks} | ${tsprev.clicks} | ${delta(ts30.clicks, tsprev.clicks)} |`);
lines.push(`| Impressions | ${ts30.impressions} | ${tsprev.impressions} | ${delta(ts30.impressions, tsprev.impressions)} |`);
lines.push(`| CTR | ${ts30.ctr}% | ${tsprev.ctr}% | ${(ts30.ctr - tsprev.ctr).toFixed(1)}pp |`);
lines.push(`| Avg Position | ${ts30.position} | ${tsprev.position} | ${(ts30.position - tsprev.position).toFixed(1)} |`);
lines.push(`| Unique queries | ${snapshot.gsc.queries.length} | ${prev ? prev.gsc.queries.length : '—'} | ${prev ? delta(snapshot.gsc.queries.length, prev.gsc.queries.length) : '—'} |`);
lines.push(`| Unique pages | ${snapshot.gsc.pages.length} | ${prev ? prev.gsc.pages.length : '—'} | ${prev ? delta(snapshot.gsc.pages.length, prev.gsc.pages.length) : '—'} |`);
lines.push(``);
lines.push(`## 2. Top 20 GSC Queries (current month)`);
lines.push(``);
lines.push(`| # | Query | Clicks | Imps | CTR | Pos |`);
lines.push(`|---|---|---|---|---|---|`);
snapshot.gsc.queries
  .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
  .slice(0, 20)
  .forEach((q, i) => {
    lines.push(`| ${i + 1} | ${q.query} | ${q.clicks} | ${q.impressions} | ${q.ctr}% | ${q.position} |`);
  });
lines.push(``);
lines.push(`## 3. Brand & Headterm Tracking`);
lines.push(``);
const brandKeywords = ['기출노트', '기출노트 한능검', 'gcnote', '한능검', '한국사능력검정시험'];
lines.push(`| Keyword | Clicks | Imps | Pos | Status |`);
lines.push(`|---|---|---|---|---|`);
brandKeywords.forEach(bk => {
  const q = snapshot.gsc.queries.find(x => x.query === bk);
  if (q) {
    lines.push(`| ${bk} | ${q.clicks} | ${q.impressions} | ${q.position} | tracked |`);
  } else {
    lines.push(`| ${bk} | — | — | — | not yet appearing |`);
  }
});
lines.push(``);
lines.push(`## 4. Golden Keywords Re-validation (Naver)`);
lines.push(``);
lines.push(`| Keyword | Volume (월) | Competition | Δ vs prev |`);
lines.push(`|---|---|---|---|`);
keywordResults
  .filter(k => k.volume !== null)
  .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
  .forEach(k => {
    const prevK = prev?.keywords?.find(p => p.keyword === k.keyword);
    const d = prevK?.volume != null ? delta(k.volume, prevK.volume) : '—';
    lines.push(`| ${k.keyword} | ${k.volume} | ${k.competition} | ${d} |`);
  });
lines.push(``);
const noData = keywordResults.filter(k => k.volume === null);
if (noData.length) {
  lines.push(`### No data (Naver doesn't track):`);
  lines.push(noData.map(k => `- ${k.keyword}`).join('\n'));
  lines.push(``);
}
lines.push(`## 5. Action Items`);
lines.push(``);
lines.push(`- [ ] Update \`docs/seo-strategy.html\` § 01 snapshot 4 KPI numbers`);
lines.push(`- [ ] Add new entry to § 10 update log: "${yyyy}-${mm} v1.x — monthly snapshot"`);
lines.push(`- [ ] Review § 03 brand keyword status — has "기출노트" started appearing?`);
lines.push(`- [ ] Review § 04 Quick Win progress — any 1페이지 진입?`);
lines.push(`- [ ] If Naver volume change > 30% on top 10 keywords, re-prioritize Phase 2 roadmap`);
lines.push(``);
lines.push(`---`);
lines.push(`*Auto-generated by \`author-tool/scripts/seo-monthly-update.mjs\`. Run again with \`cd author-tool && npm run seo:monthly\`.*`);

fs.writeFileSync(path.join(monthDir, 'digest.md'), lines.join('\n'));

console.log(`\n✓ Snapshot saved: ${path.relative(ROOT, path.join(monthDir, 'snapshot.json'))}`);
console.log(`✓ Digest saved: ${path.relative(ROOT, path.join(monthDir, 'digest.md'))}`);
console.log(`\n=== Summary ===`);
console.log(`Clicks: ${ts30.clicks} (${delta(ts30.clicks, tsprev.clicks)})`);
console.log(`Imps: ${ts30.impressions} (${delta(ts30.impressions, tsprev.impressions)})`);
console.log(`Queries: ${snapshot.gsc.queries.length}`);
console.log(`Brand "기출노트" appearing: ${snapshot.gsc.queries.some(q => q.query.includes('기출노트')) ? 'YES ✓' : 'not yet'}`);
console.log(`\nNext: read digest.md, update seo-strategy.html § 01 + § 10.`);
