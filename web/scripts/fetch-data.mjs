/**
 * Pre-build script: fetch all exam data from R2 and save to .data-cache/
 * This avoids hundreds of concurrent R2 fetches during SSG build.
 *
 * Usage: node scripts/fetch-data.mjs
 * Requires: R2_PUBLIC_URL environment variable
 */

import fs from "node:fs";
import path from "node:path";

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
if (!R2_PUBLIC_URL) {
  console.warn("WARN: R2_PUBLIC_URL not set — skipping R2 data fetch, using local fallback");
  process.exit(0);
}

const CACHE_DIR = path.join(process.cwd(), ".data-cache");

async function fetchJson(key) {
  const url = `${R2_PUBLIC_URL}/${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${url} (${res.status})`);
  return res.json();
}

async function main() {
  console.log(`Fetching data from R2: ${R2_PUBLIC_URL}`);

  // Ensure cache directory
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  // 1. Fetch manifest
  const manifest = await fetchJson("manifest.json");
  fs.writeFileSync(
    path.join(CACHE_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
  console.log(`  manifest.json (${manifest.exams.length} exams)`);

  // 2. Fetch all exam files (in batches of 5 to avoid connection limits)
  const examNumbers = manifest.exams.map((e) => e.examNumber);
  const BATCH_SIZE = 5;

  for (let i = 0; i < examNumbers.length; i += BATCH_SIZE) {
    const batch = examNumbers.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (n) => {
        const data = await fetchJson(`questions/exam-${n}.json`);
        fs.writeFileSync(
          path.join(CACHE_DIR, `exam-${n}.json`),
          JSON.stringify(data)
        );
      })
    );
    console.log(`  exams ${batch[0]}~${batch[batch.length - 1]} ✓`);
  }

  // 3. Fetch keywords
  try {
    const keywords = await fetchJson("questions/keywords.json");
    fs.writeFileSync(
      path.join(CACHE_DIR, "keywords.json"),
      JSON.stringify(keywords)
    );
    console.log("  keywords.json ✓");
  } catch {
    console.log("  keywords.json (not found, skipping)");
  }

  console.log(`\nDone! Cached ${examNumbers.length} exams to ${CACHE_DIR}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
