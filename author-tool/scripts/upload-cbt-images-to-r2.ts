/**
 * One-shot uploader: cbt_data/images/ → R2 (cbt-images/ prefix)
 *
 * 239k+ image files (~1.9GB total) sit locally — they were downloaded
 * from cbtbank.kr before the source started returning 403 to all hot-
 * link requests. We mirror them to R2 so the public site can serve
 * them without depending on cbtbank.kr.
 *
 * Run from author-tool dir: `npx tsx scripts/upload-cbt-images-to-r2.ts`
 *
 * After upload:
 *   web/lib/cbt-data.ts rewrites question.images[].url and
 *   choices[].images[].url from cbtbank.kr → ${R2_PUBLIC_URL}/cbt-images/...
 *   using the local_path field already present in CBT JSON.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { putObject } from '../server/services/r2.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const SOURCE_DIR = path.join(ROOT, 'cbt_data', 'images');
const R2_PREFIX = 'cbt-images';
const CONCURRENCY = 32;

interface FileTask {
  abs: string;
  key: string;
  size: number;
  contentType: string;
}

function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.gif':
      return 'image/gif';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.svg':
      return 'image/svg+xml';
    case '.bmp':
      return 'image/bmp';
    default:
      return 'application/octet-stream';
  }
}

function* walkFiles(dir: string): Generator<string> {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkFiles(abs);
    } else if (entry.isFile()) {
      yield abs;
    }
  }
}

function collectFiles(): FileTask[] {
  if (!fs.existsSync(SOURCE_DIR)) {
    throw new Error(`Source dir missing: ${SOURCE_DIR}`);
  }
  const tasks: FileTask[] = [];
  for (const abs of walkFiles(SOURCE_DIR)) {
    const stat = fs.statSync(abs);
    const rel = path.relative(SOURCE_DIR, abs).replace(/\\/g, '/');
    tasks.push({
      abs,
      key: `${R2_PREFIX}/${rel}`,
      size: stat.size,
      contentType: getContentType(abs),
    });
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
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)}MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)}GB`;
}

async function main() {
  console.log(`Scanning ${SOURCE_DIR}...`);
  const tasks = collectFiles();
  const totalBytes = tasks.reduce((sum, t) => sum + t.size, 0);
  console.log(`Found ${tasks.length.toLocaleString()} files (${fmtBytes(totalBytes)})`);
  console.log(`Uploading to R2 with concurrency ${CONCURRENCY}...`);

  let done = 0;
  let bytesDone = 0;
  let errors = 0;
  const t0 = Date.now();
  const logEvery = 2000; // log every 2k files

  await processConcurrent(tasks, CONCURRENCY, async (task) => {
    try {
      const buf = fs.readFileSync(task.abs);
      await putObject(task.key, buf, task.contentType);
      bytesDone += task.size;
    } catch (e) {
      errors++;
      throw e;
    } finally {
      done++;
      if (done % logEvery === 0 || done === tasks.length) {
        const pct = ((done / tasks.length) * 100).toFixed(1);
        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        const rate = (done / Math.max(1, (Date.now() - t0) / 1000)).toFixed(0);
        const eta =
          done < tasks.length
            ? `, ETA ${(((tasks.length - done) / parseFloat(rate)) / 60).toFixed(1)}min`
            : '';
        console.log(
          `[${done.toLocaleString()}/${tasks.length.toLocaleString()}] ${pct}% · ${fmtBytes(bytesDone)} · ${elapsed}s · ${rate}/s${eta} · err ${errors}`,
        );
      }
    }
  });

  const totalSec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(
    `\n✅ Uploaded ${tasks.length.toLocaleString()} files (${fmtBytes(totalBytes)}) in ${totalSec}s · errors ${errors}`,
  );
  console.log(`R2 prefix: ${R2_PREFIX}/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
