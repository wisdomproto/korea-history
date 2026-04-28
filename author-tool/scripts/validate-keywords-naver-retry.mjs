// Retry failed keywords (batch 9-10 of validate-keywords-naver) with safer variants.
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config as loadEnv } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../');
loadEnv({ path: path.resolve(__dirname, '../.env') });
const LICENSE = process.env.NAVER_API_LICENSE_KEY;
const SECRET = process.env.NAVER_API_SECRET_KEY;
const CUSTOMER = process.env.NAVER_API_CUSTOMER_ID;

// Failed candidates — split into safer batches (avoid · / numbers in same batch)
// Re-mapping special-char keywords to common Naver-friendly variants
const RETRY_KEYWORDS = [
  // Pure 한글 events (failed because batched with 3·1 / 5·18)
  '병자호란',
  '정묘호란',
  '동학농민운동',
  '광무개혁',
  '대한제국',
  '임시정부',
  '6월민주항쟁',  // remove ·
  '광주민주화운동', // remove "5·18" prefix
  '후삼국통일',
  '음서제',
  '삼일운동',  // alternative for "3·1 운동"
  '5.18',     // dot instead of ·
  '오일팔',    // phonetic alternative
];

async function fetchBatch(keywords) {
  const ts = String(Date.now());
  const path = '/keywordstool';
  const sig = crypto.createHmac('sha256', SECRET).update(`${ts}.GET.${path}`).digest('base64');
  const cleaned = keywords.map(k => k.trim().replace(/\s+/g, ''));
  const url = `https://api.naver.com${path}?hintKeywords=${cleaned.map(k => encodeURIComponent(k)).join(',')}&showDetail=1`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'X-Timestamp': ts, 'X-API-KEY': LICENSE, 'X-Customer': CUSTOMER, 'X-Signature': sig },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`  ! ${cleaned.join(',')} → ${res.status} ${body.slice(0, 150)}`);
    return [];
  }
  const data = await res.json();
  return data.keywordList ?? [];
}

function normalize(s) { return (s ?? '').toString().trim().replace(/\s+/g, ''); }
function num(v) { return typeof v === 'number' ? v : parseInt(String(v), 10) || 0; }

// Try ONE keyword at a time to isolate failures
const results = [];
for (const kw of RETRY_KEYWORDS) {
  process.stdout.write(`Querying "${kw}"... `);
  const rows = await fetchBatch([kw]);
  const norm = normalize(kw);
  const exact = rows.find(r => normalize(r.relKeyword) === norm);
  if (exact) {
    const total = num(exact.monthlyPcQcCnt) + num(exact.monthlyMobileQcCnt);
    const comp = exact.compIdx ?? '낮음';
    const isGolden = total >= 100 && (comp.includes('낮음') || comp.includes('중간'));
    results.push({ keyword: kw, volume: total, competition: comp, isGolden, rows: rows.length });
    console.log(`vol ${total} / 경쟁 ${comp}${isGolden ? ' ⭐' : ''} (${rows.length} related)`);
  } else {
    // No exact match — show top related keywords
    const top = rows.slice(0, 3).map(r => `${r.relKeyword}(${num(r.monthlyPcQcCnt) + num(r.monthlyMobileQcCnt)})`).join(', ');
    results.push({ keyword: kw, volume: null, competition: null, isGolden: false, rows: rows.length, related_top3: top });
    console.log(`NO EXACT MATCH (${rows.length} related: ${top})`);
  }
  await new Promise(r => setTimeout(r, 300));
}

const out = path.join(ROOT, '_research', `keyword-validation-retry-${new Date().toISOString().split('T')[0]}.json`);
fs.writeFileSync(out, JSON.stringify({ pulledAt: new Date().toISOString(), results }, null, 2));
console.log(`\nWrote ${out}`);

console.log(`\n=== Retry summary ===`);
const golden = results.filter(r => r.isGolden);
const found = results.filter(r => r.volume !== null);
console.log(`Found exact match: ${found.length}/${results.length}`);
console.log(`Golden: ${golden.length}`);
console.table(found.sort((a,b) => (b.volume??0) - (a.volume??0)).map(r => ({
  keyword: r.keyword, vol: r.volume, comp: r.competition, golden: r.isGolden ? '⭐' : ''
})));
