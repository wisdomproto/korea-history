// Pull deep GSC data for SEO strategy analysis
// Outputs: _research/gsc-deep-{date}.json
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../');
const OUT_DIR = path.join(ROOT, '_research');
fs.mkdirSync(OUT_DIR, { recursive: true });

// Load credentials from author-tool/ga4-key.json
const KEY_PATH = path.resolve(__dirname, '../ga4-key.json');
if (!fs.existsSync(KEY_PATH)) {
  console.error('ga4-key.json not found at', KEY_PATH);
  process.exit(1);
}
const key = JSON.parse(fs.readFileSync(KEY_PATH, 'utf-8'));

const auth = new google.auth.GoogleAuth({
  credentials: { client_email: key.client_email, private_key: key.private_key },
  scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
});
const wm = google.webmasters({ version: 'v3', auth });

const SITE_URL = process.env.GSC_SITE_URL || 'sc-domain:gcnote.co.kr';

function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

// GSC has 3-day lag, so end = 3 days ago
const endDate = isoDaysAgo(3);
const startDate90 = isoDaysAgo(93);
const startDate28 = isoDaysAgo(31);

async function query(start, end, dims, limit = 5000) {
  const res = await wm.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: { startDate: start, endDate: end, dimensions: dims, rowLimit: limit, dataState: 'all' },
  });
  return res.data.rows ?? [];
}

console.log(`Pulling GSC data for ${SITE_URL}`);
console.log(`90d: ${startDate90} → ${endDate}`);
console.log(`28d: ${startDate28} → ${endDate}`);

try {
  const [totals90, queries90, pages90, totals28, queries28, queryPage90] = await Promise.all([
    query(startDate90, endDate, [], 1),
    query(startDate90, endDate, ['query'], 5000),
    query(startDate90, endDate, ['page'], 1000),
    query(startDate28, endDate, [], 1),
    query(startDate28, endDate, ['query'], 5000),
    query(startDate90, endDate, ['query', 'page'], 5000),
  ]);

  const result = {
    siteUrl: SITE_URL,
    pulledAt: new Date().toISOString(),
    range90: { start: startDate90, end: endDate },
    range28: { start: startDate28, end: endDate },
    totals90: totals90[0] || null,
    totals28: totals28[0] || null,
    queries90,
    queries28,
    pages90,
    queryPage90,
  };

  const out = path.join(OUT_DIR, `gsc-deep-${endDate}.json`);
  fs.writeFileSync(out, JSON.stringify(result, null, 2));
  console.log(`\nWrote ${out}`);
  console.log(`  90d: ${queries90.length} queries, ${pages90.length} pages`);
  console.log(`  28d: ${queries28.length} queries`);
  console.log(`  query×page: ${queryPage90.length} rows`);
  if (totals90[0]) {
    const t = totals90[0];
    console.log(`\n90d totals: ${Math.round(t.clicks)} clicks · ${Math.round(t.impressions)} imps · CTR ${(t.ctr * 100).toFixed(2)}% · pos ${t.position?.toFixed(1)}`);
  }
} catch (err) {
  console.error('GSC pull failed:', err.message);
  if (err.response?.data?.error) {
    console.error('API error:', JSON.stringify(err.response.data.error, null, 2));
  }
  process.exit(1);
}
