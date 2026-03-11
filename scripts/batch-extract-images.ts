/**
 * Batch image extraction script
 *
 * Extracts passage/reference images from exam PDFs using the existing
 * Python extraction script (Gemini 3.1 Pro bbox detection), uploads
 * to R2, and updates exam JSON files with imageUrl per question.
 *
 * Usage:
 *   npx tsx scripts/batch-extract-images.ts --exam 77
 *   npx tsx scripts/batch-extract-images.ts --exam 76,77
 *   npx tsx scripts/batch-extract-images.ts --exam 70-77
 *   npx tsx scripts/batch-extract-images.ts --all            # all exams with 0 images
 *   npx tsx scripts/batch-extract-images.ts --exam 77 --dry   # dry run (no upload)
 */

import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import { readFileSync } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PDF_DIR = path.join(ROOT, '기출문제', '1. 기출문제');
const DATA_DIR = path.join(ROOT, 'data', 'questions');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'extract-images-from-pdf.py');

// Load .env manually (no dotenv dependency)
function loadEnv(envPath: string) {
  try {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      // Strip quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch { /* file not found, ignore */ }
}
loadEnv(path.join(ROOT, 'author-tool', '.env'));

const execFileAsync = promisify(execFile);

// ── R2 Client (use createRequire to load from author-tool/node_modules) ──
import { createRequire } from 'module';
const authorRequire = createRequire(path.join(ROOT, 'author-tool', 'package.json'));
const { S3Client: S3ClientClass, PutObjectCommand: PutObjectCommandClass } = authorRequire('@aws-sdk/client-s3');

let S3Client = S3ClientClass;
let PutObjectCommand = PutObjectCommandClass;

function createR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId) throw new Error('R2_ACCOUNT_ID not set in author-tool/.env');
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

const BUCKET = process.env.R2_BUCKET_NAME ?? 'korea-history-data';
const PUBLIC_URL = process.env.R2_PUBLIC_URL ?? '';

async function uploadToR2(client: any, key: string, buffer: Buffer, contentType: string): Promise<string> {
  await client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  return `${PUBLIC_URL}/${key}`;
}

// ── Find Python ──
async function findPython(): Promise<string> {
  for (const cmd of ['python', 'python3']) {
    try {
      await execFileAsync(cmd, ['--version'], { timeout: 5000 });
      return cmd;
    } catch { /* try next */ }
  }
  throw new Error('Python not found');
}

// ── Find PDF for exam number ──
async function findPdf(examNumber: number): Promise<string | null> {
  const files = await fs.readdir(PDF_DIR);
  // Match patterns like "한국사능력검정 심화 77회 기출문제.pdf" or "한국사능력검정 고급 10회 기출문제.pdf"
  const match = files.find(f =>
    f.includes(`${examNumber}회`) && f.endsWith('.pdf')
  );
  return match ? path.join(PDF_DIR, match) : null;
}

// ── Load exam JSON ──
interface ExamFile {
  exam: { id: number; examNumber: number; [key: string]: any };
  questions: Array<{ id: number; questionNumber: number; imageUrl?: string | null; [key: string]: any }>;
}

async function loadExam(examNumber: number): Promise<{ data: ExamFile; filePath: string } | null> {
  const files = await fs.readdir(DATA_DIR);
  for (const f of files) {
    if (!f.startsWith('exam-') || !f.endsWith('.json') || f === 'exam-order.json') continue;
    const filePath = path.join(DATA_DIR, f);
    const raw = await fs.readFile(filePath, 'utf-8');
    const data: ExamFile = JSON.parse(raw);
    if (data.exam.examNumber === examNumber) {
      return { data, filePath };
    }
  }
  return null;
}

// ── Run Python extraction ──
function runPythonExtraction(
  python: string,
  pdfPath: string,
  outDir: string,
  examNumber: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(python, [
      SCRIPT_PATH, pdfPath,
      '--output', outDir,
      '--exam-id', String(examNumber),
    ], { timeout: 10 * 60 * 1000 });

    proc.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString().trim();
      if (text) {
        for (const line of text.split('\n')) {
          const t = line.trim();
          if (t) console.log(`    ${t}`);
        }
      }
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString().trim();
      if (text) console.error(`    [stderr] ${text}`);
    });

    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Python exited with code ${code}`));
    });
    proc.on('error', reject);
  });
}

// ── Process single exam ──
async function processExam(
  examNumber: number,
  python: string,
  r2Client: any | null,
  dryRun: boolean,
): Promise<{ extracted: number; uploaded: number; updated: number }> {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Exam ${examNumber}`);
  console.log(`${'═'.repeat(60)}`);

  // 1. Find PDF
  const pdfPath = await findPdf(examNumber);
  if (!pdfPath) {
    console.log(`  ❌ PDF not found for exam ${examNumber}`);
    return { extracted: 0, uploaded: 0, updated: 0 };
  }
  console.log(`  PDF: ${path.basename(pdfPath)}`);

  // 2. Load exam JSON
  const examResult = await loadExam(examNumber);
  if (!examResult) {
    console.log(`  ❌ Exam JSON not found for exam ${examNumber}`);
    return { extracted: 0, uploaded: 0, updated: 0 };
  }
  console.log(`  JSON: ${path.basename(examResult.filePath)} (${examResult.data.questions.length} questions)`);

  // 3. Create temp directory & run extraction
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), `pdf-img-${examNumber}-`));
  const outDir = path.join(tmpDir, 'output');
  await fs.mkdir(outDir, { recursive: true });

  try {
    console.log(`  🔍 Extracting images (Gemini 3.1 Pro)...`);
    await runPythonExtraction(python, pdfPath, outDir, examNumber);

    // 4. Read manifest
    const manifestPath = path.join(outDir, `exam-${examNumber}_manifest.json`);
    let manifest: { images: Array<{ question: number; type: string; description: string; file: string }> };
    try {
      const raw = await fs.readFile(manifestPath, 'utf-8');
      manifest = JSON.parse(raw);
    } catch {
      console.log(`  ⚠️ No manifest found — no images extracted`);
      return { extracted: 0, uploaded: 0, updated: 0 };
    }

    if (!manifest.images?.length) {
      console.log(`  ⚠️ Manifest empty — no images`);
      return { extracted: 0, uploaded: 0, updated: 0 };
    }

    // Deduplicate: first image per question
    const uniqueImages = new Map<number, typeof manifest.images[0]>();
    for (const img of manifest.images) {
      if (!uniqueImages.has(img.question)) uniqueImages.set(img.question, img);
    }

    console.log(`  📸 Extracted ${manifest.images.length} images (${uniqueImages.size} unique questions)`);

    if (dryRun) {
      console.log(`  🏁 Dry run — skipping upload & JSON update`);
      return { extracted: uniqueImages.size, uploaded: 0, updated: 0 };
    }

    // 5. Upload to R2
    if (!r2Client) throw new Error('R2 client not available');
    const imageUrls = new Map<number, string>();
    let uploadCount = 0;

    for (const [qNum, img] of uniqueImages) {
      try {
        const imgPath = path.join(outDir, img.file);
        const imgBuffer = await fs.readFile(imgPath);
        const ext = img.file.split('.').pop() ?? 'png';
        const r2Key = `images/img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const url = await uploadToR2(r2Client, r2Key, imgBuffer, `image/${ext}`);
        imageUrls.set(qNum, url);
        uploadCount++;
        if (uploadCount % 10 === 0 || uploadCount === uniqueImages.size) {
          console.log(`  ⬆️ Upload: ${uploadCount}/${uniqueImages.size}`);
        }
      } catch (err) {
        console.error(`  ❌ Upload failed Q${qNum}:`, err);
      }
    }

    console.log(`  ✅ Uploaded ${imageUrls.size} images to R2`);

    // 6. Update exam JSON with imageUrl (merge — preserve existing)
    let updatedCount = 0;
    let preservedCount = 0;
    for (const q of examResult.data.questions) {
      const newUrl = imageUrls.get(q.questionNumber);
      if (newUrl) {
        q.imageUrl = newUrl;
        updatedCount++;
      } else if (q.imageUrl) {
        preservedCount++;  // keep existing imageUrl
      }
    }
    console.log(`  🔄 New: ${updatedCount}, Preserved: ${preservedCount}, Total: ${updatedCount + preservedCount}`);

    const updatedJson = JSON.stringify(examResult.data, null, 2) + '\n';

    // Verify imageUrl is in the serialized JSON
    const verifyCount = (updatedJson.match(/"imageUrl"/g) || []).length;
    console.log(`  🔍 Verify: ${verifyCount} imageUrl fields in serialized JSON`);

    // Write to local file
    await fs.writeFile(examResult.filePath, updatedJson, 'utf-8');
    console.log(`  📝 Updated ${updatedCount} questions in ${path.basename(examResult.filePath)}`);

    // Write to R2 (source of truth for author-tool)
    const r2ExamKey = `questions/${path.basename(examResult.filePath)}`;
    await r2Client.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: r2ExamKey,
      Body: updatedJson.trim(),
      ContentType: 'application/json',
    }));
    console.log(`  ☁️ Synced to R2: ${r2ExamKey}`);

    return { extracted: uniqueImages.size, uploaded: imageUrls.size, updated: updatedCount };
  } finally {
    // Cleanup
    try { await fs.rm(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

// ── Parse exam range ──
function parseExamRange(input: string): number[] {
  const nums = new Set<number>();
  for (const part of input.split(',')) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [start, end] = trimmed.split('-').map(Number);
      for (let i = start; i <= end; i++) nums.add(i);
    } else {
      nums.add(Number(trimmed));
    }
  }
  return [...nums].sort((a, b) => b - a); // descending
}

// ── Find exams with incomplete images ──
async function findExamsWithMissingImages(): Promise<number[]> {
  const files = await fs.readdir(DATA_DIR);
  const result: number[] = [];
  for (const f of files) {
    if (!f.startsWith('exam-') || !f.endsWith('.json') || f === 'exam-order.json') continue;
    const raw = await fs.readFile(path.join(DATA_DIR, f), 'utf-8');
    const data: ExamFile = JSON.parse(raw);
    if (data.questions.length === 0) continue;
    const withImage = data.questions.filter(q => q.imageUrl).length;
    if (withImage < data.questions.length) result.push(data.exam.examNumber);
  }
  return result.sort((a, b) => b - a); // descending
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Main ──
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry');
  const allMode = args.includes('--all');
  const examIdx = args.indexOf('--exam');
  const delayIdx = args.indexOf('--delay');
  const delaySec = delayIdx >= 0 ? Number(args[delayIdx + 1]) || 60 : 0;

  let examNumbers: number[];
  if (allMode) {
    examNumbers = await findExamsWithMissingImages();
    console.log(`Found ${examNumbers.length} exams with missing images`);
  } else if (examIdx >= 0 && args[examIdx + 1]) {
    examNumbers = parseExamRange(args[examIdx + 1]);
  } else {
    console.log('Usage:');
    console.log('  npx tsx scripts/batch-extract-images.ts --exam 77');
    console.log('  npx tsx scripts/batch-extract-images.ts --exam 70-77');
    console.log('  npx tsx scripts/batch-extract-images.ts --all');
    console.log('  npx tsx scripts/batch-extract-images.ts --all --delay 90');
    console.log('  npx tsx scripts/batch-extract-images.ts --exam 77 --dry');
    process.exit(1);
  }

  if (examNumbers.length === 0) {
    console.log('No exams to process');
    process.exit(0);
  }

  console.log(`\nExams to process: ${examNumbers.join(', ')}`);
  console.log(`Dry run: ${dryRun}`);
  if (delaySec > 0) console.log(`Delay between exams: ${delaySec}s`);

  const python = await findPython();
  console.log(`Python: ${python}`);

  const r2Client = dryRun ? null : createR2Client();
  if (!dryRun) console.log(`R2 Bucket: ${BUCKET}`);

  const stats = { total: examNumbers.length, success: 0, failed: 0, skipped: 0, totalImages: 0 };

  for (let i = 0; i < examNumbers.length; i++) {
    const examNum = examNumbers[i];

    // Delay between exams (skip first)
    if (i > 0 && delaySec > 0) {
      console.log(`\n  ⏳ Waiting ${delaySec}s before next exam...`);
      await sleep(delaySec * 1000);
    }

    try {
      const result = await processExam(examNum, python, r2Client, dryRun);
      if (result.extracted > 0) {
        stats.success++;
        stats.totalImages += result.uploaded || result.extracted;
      } else {
        stats.skipped++;
        console.log(`  ⚠️ Exam ${examNum}: 0 images extracted (API errors)`);
      }
    } catch (err) {
      stats.failed++;
      console.error(`  ❌ Exam ${examNum} failed:`, err);
    }

    // Progress
    const done = i + 1;
    const pct = Math.round((done / examNumbers.length) * 100);
    console.log(`\n  📊 Progress: ${done}/${examNumbers.length} (${pct}%) | OK: ${stats.success} | Skip: ${stats.skipped} | Fail: ${stats.failed}`);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  BATCH COMPLETE`);
  console.log(`  Total: ${stats.total} exams`);
  console.log(`  Success: ${stats.success}`);
  console.log(`  Skipped: ${stats.skipped}`);
  console.log(`  Failed: ${stats.failed}`);
  console.log(`  Images: ${stats.totalImages}`);
  console.log(`${'═'.repeat(60)}`);
}

main().catch(console.error);
