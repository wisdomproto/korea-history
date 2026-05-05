/**
 * One-shot uploader: web/data/civil-notes-auto/ → R2
 *
 * 656 stem × 4 files (~457MB total).
 * Run from author-tool dir: `npx tsx scripts/upload-civil-notes-auto-to-r2.ts`
 *
 * After upload + lib refactor, civil-notes-auto/ stays gitignored. R2 is source of truth.
 * Re-run any time `npm run build:civil-guides` regenerates local data.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { putObject } from '../server/services/r2.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const SOURCE_DIR = path.join(ROOT, 'web', 'data', 'civil-notes-auto');
const R2_PREFIX = 'civil-notes-auto';
const CONCURRENCY = 24;

interface FileTask {
  abs: string;
  key: string;
  size: number;
}

function collectFiles(): FileTask[] {
  if (!fs.existsSync(SOURCE_DIR)) {
    throw new Error(`Source dir missing: ${SOURCE_DIR}`);
  }
  const stems = fs.readdirSync(SOURCE_DIR, { withFileTypes: true }).filter((d) => d.isDirectory());
  const tasks: FileTask[] = [];
  for (const stem of stems) {
    const stemDir = path.join(SOURCE_DIR, stem.name);
    const files = fs.readdirSync(stemDir, { withFileTypes: true }).filter((d) => d.isFile());
    for (const f of files) {
      const abs = path.join(stemDir, f.name);
      const stat = fs.statSync(abs);
      tasks.push({
        abs,
        key: `${R2_PREFIX}/${stem.name}/${f.name}`,
        size: stat.size,
      });
    }
  }
  return tasks;
}

async function processConcurrent<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];
  const workers = Array(concurrency)
    .fill(0)
    .map(async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (item === undefined) break;
        try {
          await fn(item);
        } catch (e) {
          console.error(`[ERROR]`, e);
        }
      }
    });
  await Promise.all(workers);
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}

async function main() {
  console.log(`Scanning ${SOURCE_DIR}...`);
  const tasks = collectFiles();
  const totalBytes = tasks.reduce((sum, t) => sum + t.size, 0);
  console.log(
    `Found ${tasks.length} files across ${new Set(tasks.map((t) => t.key.split('/')[1])).size} stems (${fmtBytes(totalBytes)})`,
  );
  console.log(`Uploading to R2 with concurrency ${CONCURRENCY}...`);

  let done = 0;
  let bytesDone = 0;
  const t0 = Date.now();

  await processConcurrent(tasks, CONCURRENCY, async (task) => {
    const buf = fs.readFileSync(task.abs);
    await putObject(task.key, buf, 'application/json');
    done++;
    bytesDone += task.size;
    if (done % 200 === 0 || done === tasks.length) {
      const pct = ((done / tasks.length) * 100).toFixed(1);
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(
        `[${done}/${tasks.length}] ${pct}% · ${fmtBytes(bytesDone)} · ${elapsed}s elapsed`,
      );
    }
  });

  const totalSec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n✅ Uploaded ${tasks.length} files (${fmtBytes(totalBytes)}) in ${totalSec}s`);
  console.log(`R2 prefix: ${R2_PREFIX}/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
