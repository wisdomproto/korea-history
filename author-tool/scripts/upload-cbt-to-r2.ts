/**
 * Upload CBT exam data from cbt_data/ to R2 bucket.
 *
 * Usage:
 *   cd author-tool && npx tsx scripts/upload-cbt-to-r2.ts [--dry-run] [--skip-images] [--filter=전기기능사] [--reset]
 *
 * Features:
 *   - Checkpoint-based resume: saves progress to cbt_upload_checkpoint.json
 *   - If interrupted, just run again — skips already uploaded categories
 *   - --reset: clear checkpoint and start fresh
 *   - Per-category error handling: fails on one category won't stop others
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ─── Config ───

const CBT_DATA_DIR = path.resolve(__dirname, '../../cbt_data');
const CHECKPOINT_PATH = path.resolve(__dirname, '../../cbt_data/upload_checkpoint.json');
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'korea-history-data';
const R2_PREFIX = 'cbt';

const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_IMAGES = process.argv.includes('--skip-images');
const RESET = process.argv.includes('--reset');
const FILTER = process.argv.find((a) => a.startsWith('--filter='))?.split('=')[1];

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

// ─── Checkpoint ───

interface Checkpoint {
  completedCategories: string[];  // category names
  totalExams: number;
  totalQuestions: number;
  totalImages: number;
  lastUpdated: string;
}

async function loadCheckpoint(): Promise<Checkpoint> {
  try {
    const raw = await fs.readFile(CHECKPOINT_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { completedCategories: [], totalExams: 0, totalQuestions: 0, totalImages: 0, lastUpdated: '' };
  }
}

async function saveCheckpoint(cp: Checkpoint): Promise<void> {
  cp.lastUpdated = new Date().toISOString();
  await fs.writeFile(CHECKPOINT_PATH, JSON.stringify(cp, null, 2), 'utf-8');
}

// ─── Helpers ───

function slugify(name: string): string {
  return name.trim().replace(/\s+/g, '-').replace(/[^\w가-힣\-]/g, '').toLowerCase();
}

let uploadCount = 0;

async function uploadToR2(key: string, body: Buffer | string, contentType: string) {
  const fullKey = `${R2_PREFIX}/${key}`;
  if (DRY_RUN) return;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: fullKey,
          Body: typeof body === 'string' ? Buffer.from(body, 'utf-8') : body,
          ContentType: contentType,
        }),
      );
      uploadCount++;
      return;
    } catch (err: any) {
      if (attempt === 3) throw err;
      console.warn(`    ⚠️  Upload retry ${attempt}/3: ${fullKey} — ${err.message}`);
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try { await fs.access(filePath); return true; } catch { return false; }
}

// ─── Main ───

async function main() {
  console.log(`\n📦 CBT Data → R2 Upload`);
  console.log(`  Bucket: ${R2_BUCKET} (prefix: ${R2_PREFIX}/)`);
  console.log(`  Source: ${CBT_DATA_DIR}`);
  if (DRY_RUN) console.log(`  ⚠️  DRY RUN`);
  if (SKIP_IMAGES) console.log(`  ⚠️  Skipping images`);
  if (FILTER) console.log(`  🔍 Filter: ${FILTER}`);

  // Reset checkpoint if requested
  if (RESET) {
    try { await fs.unlink(CHECKPOINT_PATH); } catch {}
    console.log(`  🔄 Checkpoint reset`);
  }

  const cp = await loadCheckpoint();
  if (cp.completedCategories.length > 0 && !RESET) {
    console.log(`  📌 Resuming: ${cp.completedCategories.length} categories already done`);
    console.log(`     (${cp.totalExams} exams, ${cp.totalQuestions.toLocaleString()} questions, ${cp.totalImages.toLocaleString()} images so far)`);
  }
  console.log();

  // Read categories
  const catsPath = path.join(CBT_DATA_DIR, 'json', '_categories.json');
  const rawCats: Array<{ name: string; url: string }> = JSON.parse(await fs.readFile(catsPath, 'utf-8'));

  const filtered = FILTER ? rawCats.filter((c) => c.name.includes(FILTER)) : rawCats;
  const remaining = filtered.filter((c) => !cp.completedCategories.includes(c.name));

  console.log(`📋 ${filtered.length} total, ${remaining.length} remaining\n`);

  const enrichedCategories: any[] = [];
  let errors: string[] = [];
  const startTime = Date.now();

  // Build enriched categories for ALL (including already done)
  for (const cat of filtered) {
    const catFileName = cat.name.replace(/ /g, '_') + '.json';
    const catFilePath = path.join(CBT_DATA_DIR, 'json', catFileName);
    if (!(await fileExists(catFilePath))) continue;
    const catData = JSON.parse(await fs.readFile(catFilePath, 'utf-8'));
    const exams = catData.exams || [];
    if (exams.length === 0) continue;
    const code = slugify(cat.name);
    const questionCount = exams.reduce((sum: number, e: any) => sum + (e.question_count || e.questions?.length || 0), 0);
    enrichedCategories.push({ name: cat.name, code, url: cat.url, examCount: exams.length, questionCount });
  }

  // Process remaining categories
  for (let ci = 0; ci < remaining.length; ci++) {
    const cat = remaining[ci];
    const catFileName = cat.name.replace(/ /g, '_') + '.json';
    const catFilePath = path.join(CBT_DATA_DIR, 'json', catFileName);

    if (!(await fileExists(catFilePath))) {
      errors.push(`Missing: ${catFileName}`);
      continue;
    }

    const catData = JSON.parse(await fs.readFile(catFilePath, 'utf-8'));
    const examMetas: any[] = catData.exams || [];
    if (examMetas.length === 0) { errors.push(`Empty: ${cat.name}`); continue; }

    const code = slugify(cat.name);
    const questionCount = examMetas.reduce((sum: number, e: any) => sum + (e.question_count || e.questions?.length || 0), 0);

    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log(`[${ci + 1}/${remaining.length}] ${cat.name} (${examMetas.length} exams, ${questionCount} q) [${elapsed}m]`);

    try {
      // Manifest
      const manifest = {
        category: { name: cat.name, code, url: cat.url, examCount: examMetas.length, questionCount },
        exams: examMetas.map((e: any) => ({
          exam_id: e.exam_id, label: e.label, date: e.date,
          question_count: e.question_count || e.questions?.length || 0,
        })),
      };
      await uploadToR2(`${code}/manifest.json`, JSON.stringify(manifest, null, 2), 'application/json');

      // Individual exam files (from exams/ folder for clean encoding)
      for (const meta of examMetas) {
        const examFilePath = path.join(CBT_DATA_DIR, 'json', 'exams', `${meta.exam_id}.json`);
        let examJson: string;
        if (await fileExists(examFilePath)) {
          examJson = await fs.readFile(examFilePath, 'utf-8');
        } else {
          examJson = JSON.stringify({
            exam_id: meta.exam_id, label: meta.label, date: meta.date, url: meta.url,
            question_count: meta.question_count || meta.questions?.length || 0,
            questions: meta.questions || [],
          });
        }
        await uploadToR2(`${code}/exams/${meta.exam_id}.json`, examJson, 'application/json');
      }

      cp.totalExams += examMetas.length;
      cp.totalQuestions += questionCount;

      // Images
      if (!SKIP_IMAGES) {
        const prefixMatch = examMetas[0].exam_id.match(/^[a-zA-Z]+/);
        if (prefixMatch) {
          const imgPrefix = prefixMatch[0];
          const imgBaseDir = path.join(CBT_DATA_DIR, 'images', imgPrefix);
          if (await fileExists(imgBaseDir)) {
            for (const meta of examMetas) {
              const examImgDir = path.join(imgBaseDir, meta.exam_id);
              if (!(await fileExists(examImgDir))) continue;
              const files = await fs.readdir(examImgDir);
              for (const file of files) {
                if (!file.match(/\.(gif|png|jpg|jpeg)$/i)) continue;
                const imgBuffer = await fs.readFile(path.join(examImgDir, file));
                const ext = path.extname(file).toLowerCase();
                const ct = ext === '.gif' ? 'image/gif' : ext === '.png' ? 'image/png' : 'image/jpeg';
                await uploadToR2(`${code}/images/${meta.exam_id}/${file}`, imgBuffer, ct);
                cp.totalImages++;
              }
            }
          }
        }
      }

      // Mark category as complete
      cp.completedCategories.push(cat.name);
      await saveCheckpoint(cp);

    } catch (err: any) {
      errors.push(`${cat.name}: ${err.message}`);
      console.error(`  ❌ ${cat.name}: ${err.message}`);
      // Save checkpoint even on error (category NOT marked complete, will retry)
      await saveCheckpoint(cp);
    }
  }

  // Upload enriched _categories.json (always, even on resume)
  console.log(`\n📤 Uploading _categories.json (${enrichedCategories.length} categories)`);
  await uploadToR2('_categories.json', JSON.stringify(enrichedCategories, null, 2), 'application/json');

  const totalElapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\n✅ Done in ${totalElapsed} minutes!`);
  console.log(`  Categories: ${cp.completedCategories.length}/${filtered.length}`);
  console.log(`  Exams: ${cp.totalExams.toLocaleString()}`);
  console.log(`  Questions: ${cp.totalQuestions.toLocaleString()}`);
  console.log(`  Images: ${cp.totalImages.toLocaleString()}`);
  console.log(`  R2 uploads: ${uploadCount.toLocaleString()}`);
  if (errors.length) {
    console.log(`\n⚠️  Errors (${errors.length}):`);
    errors.forEach((e) => console.log(`  - ${e}`));
  }
  if (cp.completedCategories.length < filtered.length) {
    console.log(`\n💡 ${filtered.length - cp.completedCategories.length} categories remaining. Run again to resume.`);
  }
}

main().catch((err) => {
  console.error('❌ Fatal:', err);
  process.exit(1);
});
