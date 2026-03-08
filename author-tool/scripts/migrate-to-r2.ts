/**
 * Migration script: local filesystem → Cloudflare R2
 *
 * Reads exam JSON files from data/questions/ and images from data/images/,
 * uploads them to R2, rewrites image URLs inside JSON to full R2 public URLs,
 * and generates manifest.json.
 *
 * Usage:
 *   cd author-tool && npx tsx scripts/migrate-to-r2.ts
 *
 * Prerequisites:
 *   - Fill in R2 env vars in author-tool/.env
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import mime from 'mime-types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');
const QUESTIONS_DIR = path.join(DATA_DIR, 'questions');
const IMAGES_DIR = path.join(DATA_DIR, 'images');

// ── R2 config ──────────────────────────────────────────────
const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME = 'korea-history-data',
  R2_PUBLIC_URL,
} = process.env;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_PUBLIC_URL) {
  console.error('❌ Missing R2 env vars. Fill in .env first:');
  console.error('   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL');
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

async function upload(key: string, body: Buffer | string, contentType: string): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: typeof body === 'string' ? Buffer.from(body, 'utf-8') : body,
      ContentType: contentType,
    }),
  );
}

function publicUrl(key: string): string {
  return `${R2_PUBLIC_URL}/${key}`;
}

// ── 1. Upload images ───────────────────────────────────────
async function uploadImages(): Promise<Map<string, string>> {
  /** Map from old relative path (e.g. "/uploads/img_xxx.png") to new R2 public URL */
  const urlMap = new Map<string, string>();

  if (!fs.existsSync(IMAGES_DIR)) {
    console.log('⚠️  No images directory found, skipping image upload.');
    return urlMap;
  }

  const files = fs.readdirSync(IMAGES_DIR).filter((f) => !f.startsWith('.'));
  console.log(`📸 Found ${files.length} images to upload.`);

  for (const file of files) {
    const filePath = path.join(IMAGES_DIR, file);
    const buf = fs.readFileSync(filePath);
    const key = `images/${file}`;
    const ct = mime.lookup(file) || 'application/octet-stream';

    await upload(key, buf, ct);
    const url = publicUrl(key);

    // Map both possible old reference formats
    urlMap.set(`/uploads/${file}`, url);
    urlMap.set(file, url);

    console.log(`  ✅ ${file} → ${key}`);
  }

  return urlMap;
}

// ── 2. Upload exam JSON files ──────────────────────────────
interface ExamData {
  exam: {
    id: number;
    examNumber: number;
    examDate: string;
    examType: string;
    totalQuestions: number;
    timeLimitMinutes: number;
    isFree: boolean;
    isVisible?: boolean;
  };
  questions: Record<string, unknown>[];
}

function rewriteUrls(obj: unknown, urlMap: Map<string, string>): unknown {
  if (typeof obj === 'string') {
    // Check if this string matches any old URL
    for (const [oldUrl, newUrl] of urlMap) {
      if (obj === oldUrl || obj.endsWith(oldUrl)) {
        return newUrl;
      }
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => rewriteUrls(item, urlMap));
  }
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = rewriteUrls(value, urlMap);
    }
    return result;
  }
  return obj;
}

async function uploadExams(urlMap: Map<string, string>): Promise<ExamData[]> {
  const files = fs
    .readdirSync(QUESTIONS_DIR)
    .filter((f) => f.startsWith('exam-') && f.endsWith('.json') && f !== 'exam-order.json');

  console.log(`\n📝 Found ${files.length} exam files to upload.`);

  const allExams: ExamData[] = [];

  for (const file of files) {
    const filePath = path.join(QUESTIONS_DIR, file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw) as ExamData;

    // Rewrite image URLs inside JSON
    const rewritten = rewriteUrls(data, urlMap) as ExamData;

    const key = `questions/${file}`;
    await upload(key, JSON.stringify(rewritten, null, 2), 'application/json');
    allExams.push(rewritten);

    console.log(`  ✅ ${file} → ${key} (${rewritten.questions.length} questions)`);
  }

  // Upload exam-order.json if exists
  const orderPath = path.join(QUESTIONS_DIR, 'exam-order.json');
  if (fs.existsSync(orderPath)) {
    const orderRaw = fs.readFileSync(orderPath, 'utf-8');
    await upload('questions/exam-order.json', orderRaw, 'application/json');
    console.log('  ✅ exam-order.json → questions/exam-order.json');
  }

  return allExams;
}

// ── 3. Generate manifest.json ──────────────────────────────
async function generateManifest(exams: ExamData[]): Promise<void> {
  const sorted = [...exams].sort((a, b) => b.exam.examNumber - a.exam.examNumber);

  const manifest = {
    generatedAt: new Date().toISOString(),
    exams: sorted.map((e) => ({
      ...e.exam,
      url: publicUrl(`questions/exam-${e.exam.examNumber}.json`),
    })),
  };

  await upload('manifest.json', JSON.stringify(manifest, null, 2), 'application/json');
  console.log(`\n📋 manifest.json uploaded with ${manifest.exams.length} exams.`);
  console.log(`   Public URL: ${publicUrl('manifest.json')}`);
}

// ── Main ───────────────────────────────────────────────────
async function main() {
  console.log('🚀 Starting R2 migration...\n');
  console.log(`   R2 Bucket: ${R2_BUCKET_NAME}`);
  console.log(`   Public URL: ${R2_PUBLIC_URL}`);
  console.log(`   Data dir: ${DATA_DIR}\n`);

  const urlMap = await uploadImages();
  const exams = await uploadExams(urlMap);
  await generateManifest(exams);

  console.log('\n✨ Migration complete!');
  console.log('\nNext steps:');
  console.log('  1. Verify data at your R2 public URL');
  console.log('  2. Update lib/constants.ts IMAGE_BASE_URL to R2_PUBLIC_URL');
  console.log('  3. Test the author tool and main app');
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
