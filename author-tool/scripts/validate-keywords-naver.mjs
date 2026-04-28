// Validate SEO golden keyword candidates against Naver Keyword API
// Outputs: _research/keyword-validation-{date}.json
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

if (!LICENSE || !SECRET || !CUSTOMER) {
  console.error('Naver API keys not set. Check author-tool/.env: NAVER_API_LICENSE_KEY, NAVER_API_SECRET_KEY, NAVER_API_CUSTOMER_ID');
  process.exit(1);
}

// ─── Keyword candidates (from SEO doc § 03 + § 06) ──────────────────────
const CANDIDATES = {
  // Brand (highest priority)
  brand: [
    '기출노트',
    '기출노트 한능검',
    'gcnote',
    '기출노트 한국사',
    '기출노트 사이트',
  ],
  // Head terms — 한능검 / 요약노트 / 기출문제 변형
  head_hangung: [
    '한능검',
    '한능검 요약',
    '한능검 요약노트',
    '한능검 무료',
    '한능검 시대별 정리',
    '한능검 정리',
    '한능검 기출문제',
    '한능검 1급 합격선',
    '한능검 출제 경향',
    '한능검 77회 답지',
    '한능검 77회',
    '한능검 일정',
    '한국사능력검정시험',
    '한국사능력검정시험 기출문제',
    '한국사 능력 검정 시험 일정',
  ],
  head_korean_history: [
    '한국사 요약',
    '한국사 요약노트',
    '한국사 능력 검정 요약',
    '한국사 기출문제',
    '한국사 정리',
  ],
  // 인물 (figures)
  figures: [
    '정조 업적',
    '정조 개혁',
    '광해군 업적',
    '광해군 평가',
    '흥선대원군 정책',
    '혜공왕 업적',
    '세종대왕 업적',
    '성종 업적',
    '광종 업적',
  ],
  // 사건 (events)
  events: [
    '갑신정변 결과',
    '갑신정변 의의',
    '을사조약 내용',
    '을사늑약 정리',
    '임진왜란 과정',
    '임진왜란 결과',
    '병자호란',
    '정묘호란',
    '동학농민운동 결과',
    '대한제국 광무개혁',
    '3·1 운동',
    '임시정부 수립',
    '6월 민주항쟁',
    '5·18 광주민주화운동',
    '후삼국 통일 과정',
  ],
  // 제도/개념 (concepts/systems)
  concepts: [
    '음서제',
    '노비안검법',
    '사림과 훈구',
    '발해 멸망',
    '환국',
    '대동법',
    '균역법',
    '훈민정음',
    '경국대전',
  ],
};

// Flatten all keywords for API call
const ALL_KEYWORDS = Object.entries(CANDIDATES).flatMap(([cat, kws]) => kws.map(k => ({ category: cat, keyword: k })));
console.log(`Validating ${ALL_KEYWORDS.length} keywords across ${Object.keys(CANDIDATES).length} categories...`);

// ─── Naver API call ──────────────────────────────────────────────────────
async function fetchBatch(keywords) {
  const ts = String(Date.now());
  const path = '/keywordstool';
  const message = `${ts}.GET.${path}`;
  const sig = crypto.createHmac('sha256', SECRET).update(message).digest('base64');
  // Naver API: spaces removed, max 10 per call
  const cleaned = keywords.map(k => k.trim().replace(/\s+/g, ''));
  const encoded = cleaned.map(k => encodeURIComponent(k)).join(',');
  const url = `https://api.naver.com${path}?hintKeywords=${encoded}&showDetail=1`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Timestamp': ts,
      'X-API-KEY': LICENSE,
      'X-Customer': CUSTOMER,
      'X-Signature': sig,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Batch ${cleaned.join(',')} failed: ${res.status} ${body.slice(0, 200)}`);
    return [];
  }
  const data = await res.json();
  return data.keywordList ?? [];
}

function normalize(s) { return (s ?? '').toString().trim().replace(/\s+/g, ''); }
function num(v) { return typeof v === 'number' ? v : parseInt(String(v), 10) || 0; }

// ─── Main ───────────────────────────────────────────────────────────────
const inputKeys = ALL_KEYWORDS.map(x => x.keyword);
const inputNormalized = new Set(inputKeys.map(normalize));
console.log('Normalized inputs:', inputKeys.length);

const BATCH = 5;
const allResults = [];
for (let i = 0; i < inputKeys.length; i += BATCH) {
  const batch = inputKeys.slice(i, i + BATCH);
  process.stdout.write(`  batch ${Math.floor(i/BATCH)+1}/${Math.ceil(inputKeys.length/BATCH)} (${batch.length})... `);
  const rows = await fetchBatch(batch);
  console.log(`got ${rows.length} rows`);
  allResults.push(...rows);
  // Naver rate limit safety
  await new Promise(r => setTimeout(r, 300));
}

// Filter results to exact-match our input keywords
const byKeyword = new Map();
for (const row of allResults) {
  const k = normalize(row.relKeyword);
  if (inputNormalized.has(k) && !byKeyword.has(k)) {
    byKeyword.set(k, row);
  }
}

// Build final report
const report = ALL_KEYWORDS.map(({ category, keyword }) => {
  const norm = normalize(keyword);
  const data = byKeyword.get(norm);
  if (!data) {
    return { category, keyword, volume: null, competition: null, status: 'NO_DATA' };
  }
  const pc = num(data.monthlyPcQcCnt);
  const mobile = num(data.monthlyMobileQcCnt);
  const total = pc + mobile;
  const competition = data.compIdx ?? '낮음';
  const isGolden = total >= 100 && (competition.includes('낮음') || competition.includes('중간'));
  return {
    category,
    keyword,
    volume_total: total,
    volume_pc: pc,
    volume_mobile: mobile,
    competition,
    pc_ctr: data.monthlyAvePcCtr ?? 0,
    mobile_ctr: data.monthlyAveMobileCtr ?? 0,
    is_golden: isGolden,
    status: 'OK',
  };
});

// Sort: golden first, then by volume desc
report.sort((a, b) => {
  if (a.is_golden !== b.is_golden) return a.is_golden ? -1 : 1;
  return (b.volume_total ?? -1) - (a.volume_total ?? -1);
});

// Save
const out = path.join(ROOT, '_research', `keyword-validation-${new Date().toISOString().split('T')[0]}.json`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ pulledAt: new Date().toISOString(), candidates: CANDIDATES, report }, null, 2));
console.log(`\nWrote ${out}`);

// Print summary
const golden = report.filter(r => r.is_golden);
const noData = report.filter(r => r.status === 'NO_DATA');
const high = report.filter(r => r.status === 'OK' && r.competition.includes('높음'));

console.log(`\n=== Summary ===`);
console.log(`Total candidates: ${report.length}`);
console.log(`Golden (vol≥100 + 경쟁 낮음/중간): ${golden.length}`);
console.log(`High competition: ${high.length}`);
console.log(`No data found: ${noData.length}`);

console.log(`\n=== Top 20 by volume ===`);
const top = report.filter(r => r.status === 'OK').slice(0, 20);
console.table(top.map(r => ({
  keyword: r.keyword,
  cat: r.category,
  vol: r.volume_total,
  comp: r.competition,
  golden: r.is_golden ? '⭐' : '',
})));

console.log(`\n=== No data (Naver doesn't track these) ===`);
noData.forEach(r => console.log(`  · ${r.category}/${r.keyword}`));
