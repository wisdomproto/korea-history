// Validate 공무원 시험 SEO golden keyword candidates against Naver Keyword API.
// Sibling of validate-keywords-naver.mjs (한능검 버전). Outputs:
//   _research/keyword-validation-civil-{date}.json
//
// 패턴 D 적용: 한능검에서 검증된 "{시험/과목} + 단원별 정리/요약/정리본/기출" 조합.
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../');

// dotenv는 author-tool에 설치돼있을 때만 사용. 없으면 Node 22 --env-file 플래그로 로드.
try {
  const dotenv = await import('dotenv');
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
} catch (_) {
  // dotenv 미설치 — `node --env-file=author-tool/.env` 로 실행할 것
}

const LICENSE = process.env.NAVER_API_LICENSE_KEY;
const SECRET = process.env.NAVER_API_SECRET_KEY;
const CUSTOMER = process.env.NAVER_API_CUSTOMER_ID;

if (!LICENSE || !SECRET || !CUSTOMER) {
  console.error('Naver API keys not set. Check author-tool/.env');
  process.exit(1);
}

// ─── 공무원 시험 후보 키워드 (74개, 12 카테고리) ───────────────────────
const CANDIDATES = {
  // 브랜드 확장 테스트 — 한능검에서 "기출노트 한능검" 39.7% CTR 입증, 공무원으로 확장 가능?
  brand: [
    '기출노트 공무원',
    '공무원 기출노트',
    'gcnote 공무원',
  ],
  // 헤드텀 (벤치마크 — 학원 영역, 우리 가능성 평가용)
  head: [
    '9급 공무원',
    '9급 국가직',
    '9급 지방직',
    '7급 공무원',
    '공무원 시험',
    '공무원',
  ],
  // 한국사 — 우리 강점 (한능검 자산 cross)
  korean_history: [
    '9급 공무원 한국사',
    '9급 한국사',
    '공무원 한국사',
    '9급 한국사 단원별 정리',
    '9급 한국사 시대별 정리',
    '9급 한국사 기출',
    '9급 한국사 요약',
    '9급 한국사 정리본',
  ],
  // 국어 (공통과목)
  korean_lang: [
    '9급 공무원 국어',
    '9급 국어',
    '공무원 국어',
    '공무원 국어 어법',
    '공무원 국어 비문학',
    '공무원 국어 한자',
    '9급 국어 단원별 정리',
    '9급 국어 요약',
    '9급 국어 기출',
  ],
  // 영어 (공통과목)
  english: [
    '9급 공무원 영어',
    '9급 영어',
    '공무원 영어',
    '공무원 영어 문법',
    '공무원 영어 어휘',
    '공무원 영어 독해',
    '9급 영어 단원별 정리',
    '9급 영어 기출',
  ],
  // 행정법 (일반행정 1순위 직렬 전공)
  admin_law: [
    '9급 행정법',
    '행정법 단원별 정리',
    '행정법 판례',
    '행정법 요약',
    '행정법 정리',
    '행정법 기출',
    '9급 행정법 단원별 정리',
    '9급 행정법 기출',
  ],
  // 행정학
  admin_pa: [
    '9급 행정학',
    '행정학 단원별 정리',
    '행정학 요약',
    '행정학 기출',
    '9급 행정학 정리',
  ],
  // 기타 9급 전공
  specialty_others: [
    '9급 형법',
    '9급 형사소송법',
    '9급 회계학',
    '9급 세법',
    '9급 교정학',
    '9급 사회복지학',
    '9급 교육학',
  ],
  // 직렬별
  job_series: [
    '9급 일반행정',
    '9급 세무직',
    '9급 검찰직',
    '9급 교정직',
    '9급 일반행정 기출',
    '9급 세무직 기출',
  ],
  // 7급 / PSAT / 헌법
  grade7_psat: [
    '7급 한국사',
    '7급 PSAT',
    'PSAT 헌법',
    '헌법 정리',
    '헌법 판례',
    '헌법 요약',
  ],
  // 우리 차별화 (무료, 단원별)
  differentiator: [
    '공무원 기출문제 무료',
    '공무원 무료 기출',
    '공무원 기출 사이트',
    '공무원 단원별 기출',
    '공무원 무료 학습',
  ],
  // 정보성 (트래픽 큼, 의도는 다양)
  informational: [
    '공무원 합격수기',
    '9급 합격선',
    '공무원 면접',
  ],
};

const ALL_KEYWORDS = Object.entries(CANDIDATES).flatMap(([cat, kws]) => kws.map(k => ({ category: cat, keyword: k })));
console.log(`Validating ${ALL_KEYWORDS.length} 공무원 keywords across ${Object.keys(CANDIDATES).length} categories...`);

// ─── Naver API call (한능검 스크립트와 동일) ──────────────────────────────
async function fetchBatch(keywords) {
  const ts = String(Date.now());
  const apiPath = '/keywordstool';
  const message = `${ts}.GET.${apiPath}`;
  const sig = crypto.createHmac('sha256', SECRET).update(message).digest('base64');
  const cleaned = keywords.map(k => k.trim().replace(/\s+/g, ''));
  const encoded = cleaned.map(k => encodeURIComponent(k)).join(',');
  const url = `https://api.naver.com${apiPath}?hintKeywords=${encoded}&showDetail=1`;
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

// ─── Main ─────────────────────────────────────────────────────────────────
const inputKeys = ALL_KEYWORDS.map(x => x.keyword);
const inputNormalized = new Set(inputKeys.map(normalize));

const BATCH = 5;
const allResults = [];
for (let i = 0; i < inputKeys.length; i += BATCH) {
  const batch = inputKeys.slice(i, i + BATCH);
  process.stdout.write(`  batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(inputKeys.length / BATCH)} (${batch.length})... `);
  const rows = await fetchBatch(batch);
  console.log(`got ${rows.length} rows`);
  allResults.push(...rows);
  await new Promise(r => setTimeout(r, 300));
}

const byKeyword = new Map();
for (const row of allResults) {
  const k = normalize(row.relKeyword);
  if (inputNormalized.has(k) && !byKeyword.has(k)) {
    byKeyword.set(k, row);
  }
}

const report = ALL_KEYWORDS.map(({ category, keyword }) => {
  const norm = normalize(keyword);
  const data = byKeyword.get(norm);
  if (!data) {
    return { category, keyword, volume_total: null, competition: null, status: 'NO_DATA' };
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

report.sort((a, b) => {
  if (a.is_golden !== b.is_golden) return a.is_golden ? -1 : 1;
  return (b.volume_total ?? -1) - (a.volume_total ?? -1);
});

const out = path.join(ROOT, '_research', `keyword-validation-civil-${new Date().toISOString().split('T')[0]}.json`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ pulledAt: new Date().toISOString(), candidates: CANDIDATES, report }, null, 2));
console.log(`\nWrote ${out}`);

const golden = report.filter(r => r.is_golden);
const noData = report.filter(r => r.status === 'NO_DATA');
const high = report.filter(r => r.status === 'OK' && r.competition.includes('높음'));

console.log(`\n=== Summary ===`);
console.log(`Total candidates: ${report.length}`);
console.log(`Golden (vol≥100 + 경쟁 낮음/중간): ${golden.length}`);
console.log(`High competition: ${high.length}`);
console.log(`No data found: ${noData.length}`);

console.log(`\n=== 황금 (전체) ===`);
console.table(golden.map(r => ({
  keyword: r.keyword,
  cat: r.category,
  vol: r.volume_total,
  comp: r.competition,
})));

console.log(`\n=== Top 25 by volume (전체) ===`);
const top = report.filter(r => r.status === 'OK').slice(0, 25);
console.table(top.map(r => ({
  keyword: r.keyword,
  cat: r.category,
  vol: r.volume_total,
  comp: r.competition,
  golden: r.is_golden ? '⭐' : '',
})));

console.log(`\n=== No data ===`);
noData.forEach(r => console.log(`  · ${r.category}/${r.keyword}`));
