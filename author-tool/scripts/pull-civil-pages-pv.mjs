// 공무원·자격증 페이지 PV 스냅샷 (last 30d vs prev 30d).
// 부모 컨테이너, 직렬 자식, 한국사 redirect 경로 모두 카테고리화.
// Output: author-tool/scripts/output/civil-pages-pv-{date}.json + console table
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { BetaAnalyticsDataClient } from "@google-analytics/data";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, "../.env") });

const KEY_PATH = path.resolve(__dirname, "../ga4-key.json");
const PROPERTY_ID = process.env.GA4_PROPERTY_ID;
if (!PROPERTY_ID) {
  console.error("GA4_PROPERTY_ID not set");
  process.exit(1);
}

let key;
if (fs.existsSync(KEY_PATH)) {
  key = JSON.parse(fs.readFileSync(KEY_PATH, "utf-8"));
} else if (process.env.GA4_CLIENT_EMAIL && process.env.GA4_PRIVATE_KEY) {
  key = {
    client_email: process.env.GA4_CLIENT_EMAIL,
    private_key: process.env.GA4_PRIVATE_KEY.replace(/\\n/g, "\n"),
  };
} else {
  console.error("No GA4 credentials");
  process.exit(1);
}

const ga = new BetaAnalyticsDataClient({
  credentials: { client_email: key.client_email, private_key: key.private_key },
});
const property = `properties/${PROPERTY_ID}`;

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}
function todayKST() {
  return new Date().toISOString().split("T")[0];
}

const today = todayKST();
const d1 = daysAgo(1); // 어제까지 (오늘 데이터는 incomplete)
const d30 = daysAgo(30);
const d60 = daysAgo(60);
const d31 = daysAgo(31);

console.log(`기간: 최근 30일 ${d30} ~ ${d1}  /  직전 30일 ${d60} ~ ${d31}`);
console.log();

// ExamType 슬러그 로드 — civil 카테고리 부모 + 자식 (cert 도 비교용 포함)
const EXAM_INDEX = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../../data/exam-types/index.json"), "utf-8"),
);

// 한능검은 category="civil" 이지만 별도 분류 (메인 entity)
const civilParents = EXAM_INDEX.examTypes.filter(
  (t) => t.category === "civil" && !t.parentExamId && t.id !== "korean-history",
);
const civilChildren = EXAM_INDEX.examTypes.filter(
  (t) => t.category === "civil" && t.parentExamId,
);
const certAll = EXAM_INDEX.examTypes.filter(
  (t) => t.category === "cert" && !t.parentExamId,
);

const civilParentSlugs = new Set(civilParents.map((t) => t.slug));
const civilChildSlugs = new Set(civilChildren.map((t) => t.slug));
const certSlugs = new Set(certAll.map((t) => t.slug));

// 한능검 콘텐츠 라우트 (한능검 페이지 + 글로벌 콘텐츠 라우트)
const KH_CONTENT_PATHS = new Set([
  "exam",
  "notes",
  "study",
  "wrong-answers",
  "my-record",
  "한능검",
]);

console.log(
  `대상: civil 부모 ${civilParentSlugs.size}개 (한능검 제외) · civil 직렬 자식 ${civilChildSlugs.size}개 · cert ${certSlugs.size}개`,
);
console.log();

async function pagePvReport(start, end, filter) {
  const [r] = await ga.runReport({
    property,
    dateRanges: [{ startDate: start, endDate: end }],
    dimensions: [{ name: "pagePath" }],
    metrics: [
      { name: "screenPageViews" },
      { name: "sessions" },
      { name: "averageSessionDuration" },
    ],
    limit: 1000,
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    ...(filter ? { dimensionFilter: filter } : {}),
  });
  return (r.rows ?? []).map((row) => ({
    path: row.dimensionValues[0].value,
    pv: Number(row.metricValues[0].value ?? 0),
    sessions: Number(row.metricValues[1].value ?? 0),
    avgDuration: Number(row.metricValues[2].value ?? 0),
  }));
}

// 공무원·자격증·한국사 redirect 패턴 (한글 + percent-encoded 둘 다)
const CIVIL_REGEX =
  "(/9%EC?%A0?5?%89?-|/9급-|/7%EA%B8%89-|/7급-|/%EA%B2%BD%EC%B0%B0|/경찰|/%EC%86%8C%EB%B0%A9|/소방|/%EA%B5%B0%EB%AC%B4%EC%9B%90|/군무원|/%EA%B3%84%EB%A6%AC|/계리|/%EA%B2%80%EC%B0%B0%EC%A7%81|/검찰직|/%EA%B5%90%EC%A0%95%EC%A7%81|/교정직|/%EA%B5%90%ED%96%89%EC%A7%81|/교행직|/%EC%82%AC%ED%9A%8C|/사회복지|/%EB%B3%B4%ED%98%B8|/보호직|civil-notes|/%ED%95%9C%EA%B5%AD%EC%82%AC|/한국사)";

// 경로 디코딩 (한글) + slug 매칭 카테고리화
function categorize(rawPath) {
  let pathDecoded;
  try {
    pathDecoded = decodeURIComponent(rawPath);
  } catch {
    pathDecoded = rawPath;
  }

  // 한국사 redirect 경로: /9급-XXX/한국사 또는 /[examSlug]/한국사*
  const koreanHistoryRedirect =
    /\/(9급-|7급-|경찰|소방|군무원|계리)[^/]*\/한국사/.test(pathDecoded);

  // path 첫 segment slug 추출
  const segs = pathDecoded.split("/").filter(Boolean);
  const firstSlug = segs[0] ?? "";

  let bucket = "other";
  if (pathDecoded === "/") bucket = "home";
  else if (koreanHistoryRedirect) bucket = "korean-history-redirect";
  else if (KH_CONTENT_PATHS.has(firstSlug)) bucket = "korean-history";
  else if (civilParentSlugs.has(firstSlug)) bucket = "civil-parent";
  else if (civilChildSlugs.has(firstSlug)) bucket = "civil-child";
  else if (certSlugs.has(firstSlug)) bucket = "cert";
  else if (firstSlug === "blog") bucket = "blog";
  else if (firstSlug === "civil-notes") bucket = "civil-notes-page";
  else if (firstSlug === "board") bucket = "board";

  return { bucket, firstSlug, pathDecoded };
}

async function main() {
  console.log("GA4 pageviews 호출 중…");
  const civilFilter = {
    filter: {
      fieldName: "pagePath",
      stringFilter: {
        matchType: "PARTIAL_REGEXP",
        value: CIVIL_REGEX,
      },
    },
  };
  const [recent, prev, recentCivil, prevCivil] = await Promise.all([
    pagePvReport(d30, d1),
    pagePvReport(d60, d31),
    pagePvReport(d30, d1, civilFilter), // 공무원/자격증/한국사 redirect long tail까지
    pagePvReport(d60, d31, civilFilter),
  ]);
  // top-level + filtered 합치기 (중복 제거)
  const mergedRecent = new Map(recent.map((r) => [r.path, r]));
  for (const r of recentCivil) if (!mergedRecent.has(r.path)) mergedRecent.set(r.path, r);
  const mergedPrev = new Map(prev.map((r) => [r.path, r]));
  for (const r of prevCivil) if (!mergedPrev.has(r.path)) mergedPrev.set(r.path, r);
  recent.length = 0;
  recent.push(...mergedRecent.values());
  prev.length = 0;
  prev.push(...mergedPrev.values());

  const recentByPath = new Map(recent.map((r) => [r.path, r]));
  const prevByPath = new Map(prev.map((r) => [r.path, r]));

  const all = new Set([...recentByPath.keys(), ...prevByPath.keys()]);
  const enriched = [];
  for (const p of all) {
    const r = recentByPath.get(p);
    const v = prevByPath.get(p);
    const { bucket, firstSlug, pathDecoded } = categorize(p);
    enriched.push({
      path: p,
      pathDecoded,
      bucket,
      firstSlug,
      pv30: r?.pv ?? 0,
      pvPrev30: v?.pv ?? 0,
      delta: (r?.pv ?? 0) - (v?.pv ?? 0),
      sessions30: r?.sessions ?? 0,
      avgDuration: r?.avgDuration ?? 0,
    });
  }

  // bucket 합계
  const bucketTotals = {};
  for (const row of enriched) {
    if (!bucketTotals[row.bucket])
      bucketTotals[row.bucket] = {
        pv30: 0,
        pvPrev30: 0,
        sessions30: 0,
        avgDurationSum: 0,
        pageCount: 0,
      };
    const t = bucketTotals[row.bucket];
    t.pv30 += row.pv30;
    t.pvPrev30 += row.pvPrev30;
    t.sessions30 += row.sessions30;
    t.avgDurationSum += row.avgDuration * (row.sessions30 || 1);
    t.pageCount++;
  }

  // 출력 — 버킷 요약
  console.log("\n========== 카테고리별 요약 (최근 30일) ==========");
  const bucketOrder = [
    "home",
    "korean-history",
    "blog",
    "civil-parent",
    "civil-child",
    "civil-notes-page",
    "korean-history-redirect",
    "cert",
    "board",
    "other",
  ];
  console.log(
    "bucket".padEnd(26) +
      "PV30".padStart(10) +
      "PVprev30".padStart(12) +
      "Δ".padStart(10) +
      "%".padStart(8) +
      "세션".padStart(10) +
      "평균체류(초)".padStart(14) +
      "페이지수".padStart(10),
  );
  console.log("-".repeat(100));
  for (const b of bucketOrder) {
    const t = bucketTotals[b];
    if (!t) continue;
    const delta = t.pv30 - t.pvPrev30;
    const pct = t.pvPrev30 > 0 ? ((delta / t.pvPrev30) * 100).toFixed(1) : "—";
    const avgDur = t.sessions30 > 0 ? (t.avgDurationSum / t.sessions30 / t.pageCount).toFixed(0) : "—";
    console.log(
      b.padEnd(26) +
        String(t.pv30).padStart(10) +
        String(t.pvPrev30).padStart(12) +
        String(delta).padStart(10) +
        String(pct).padStart(7) +
        "%" +
        String(t.sessions30).padStart(10) +
        String(avgDur).padStart(14) +
        String(t.pageCount).padStart(10),
    );
  }

  // 공무원 페이지 TOP 30 (civil-parent + civil-child + korean-history-redirect)
  const civilPages = enriched
    .filter((r) =>
      ["civil-parent", "civil-child", "korean-history-redirect"].includes(r.bucket),
    )
    .sort((a, b) => b.pv30 - a.pv30);

  console.log("\n========== 공무원 페이지 TOP 30 ==========");
  console.log(
    "path".padEnd(50) +
      "bucket".padEnd(28) +
      "PV30".padStart(8) +
      "PVprev30".padStart(10) +
      "체류(초)".padStart(10),
  );
  console.log("-".repeat(106));
  for (const r of civilPages.slice(0, 30)) {
    const shortPath =
      r.pathDecoded.length > 48 ? r.pathDecoded.slice(0, 47) + "…" : r.pathDecoded;
    console.log(
      shortPath.padEnd(50) +
        r.bucket.padEnd(28) +
        String(r.pv30).padStart(8) +
        String(r.pvPrev30).padStart(10) +
        String(Math.round(r.avgDuration)).padStart(10),
    );
  }

  console.log(`\n공무원 페이지 총 ${civilPages.length}개 (PV ≥ 1)`);

  // 한국사 redirect 경로 별도 강조 — 통합 결정 정당화 데이터
  const redirectPages = enriched
    .filter((r) => r.bucket === "korean-history-redirect")
    .sort((a, b) => b.pv30 - a.pv30);
  if (redirectPages.length > 0) {
    console.log("\n========== 한국사 redirect 경로 ==========");
    console.log("(이 경로들은 모두 한능검 콘텐츠로 redirect 됨)");
    console.log(
      "path".padEnd(60) +
        "PV30".padStart(8) +
        "PVprev30".padStart(10) +
        "Δ".padStart(8),
    );
    console.log("-".repeat(86));
    for (const r of redirectPages.slice(0, 20)) {
      const shortPath =
        r.pathDecoded.length > 58 ? r.pathDecoded.slice(0, 57) + "…" : r.pathDecoded;
      console.log(
        shortPath.padEnd(60) +
          String(r.pv30).padStart(8) +
          String(r.pvPrev30).padStart(10) +
          String(r.delta).padStart(8),
      );
    }
    const totalRedirectPv = redirectPages.reduce((s, r) => s + r.pv30, 0);
    console.log(`\n한국사 redirect 총 PV: ${totalRedirectPv} (모두 한능검 트래픽 흡수 대상)`);
  }

  // 저장
  const outDir = path.resolve(__dirname, "output");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `civil-pages-pv-${today}.json`);
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        period: { recent: [d30, d1], prev: [d60, d31] },
        bucketTotals,
        civilPages,
        redirectPages,
        allPagesInBuckets: enriched.filter((r) => r.bucket !== "other"),
      },
      null,
      2,
    ),
    "utf-8",
  );
  console.log(`\n저장: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
