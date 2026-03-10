import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { ImageService } from './image.service.js';
import type { ProgressCallback } from './pdf-import.service.js';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.resolve(__dirname, '../../../scripts/extract-images-from-pdf.py');
const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/** Find available python binary */
async function findPython(): Promise<string> {
  for (const cmd of ['python', 'python3']) {
    try {
      await execFileAsync(cmd, ['--version'], { timeout: 5000 });
      return cmd;
    } catch { /* try next */ }
  }
  throw new Error('Python이 설치되어 있지 않습니다. PyMuPDF가 필요합니다.');
}

/** Run Python script and stream stdout lines via onProgress */
function runPythonWithProgress(
  python: string,
  args: string[],
  onProgress?: ProgressCallback,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(python, args, { timeout: TIMEOUT_MS });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      stdout += text;
      // Forward meaningful lines as progress
      for (const line of text.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        // Parse key progress lines from the Python script
        if (trimmed.startsWith('── Page')) {
          onProgress?.(`페이지 분석 중: ${trimmed.replace('──', '').replace('──', '').trim()}`);
        } else if (trimmed.startsWith('Q')) {
          // e.g. "Q3: [screenshot] TV 뉴스 화면 → 1200x800"
          onProgress?.(`감지: ${trimmed}`);
        } else if (trimmed.startsWith('Processing')) {
          onProgress?.(trimmed);
        } else if (trimmed.startsWith('Rendering')) {
          onProgress?.('PDF 페이지 렌더링 중...');
        } else if (trimmed.startsWith('Total extracted')) {
          onProgress?.(trimmed.replace('Total extracted:', '총 추출:'));
        }
      }
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Python exited with code ${code}: ${stderr}`));
      }
    });

    proc.on('error', reject);
  });
}

export interface ExtractedImage {
  questionNumber: number;
  type: string;
  description: string;
  imageUrl: string;
}

export const PdfImageService = {
  /**
   * Extract passage/reference images from PDF and upload to R2.
   * Returns a map of questionNumber → imageUrl.
   */
  async extractAndUpload(
    pdfBuffer: Buffer,
    examNumber: number,
    onProgress?: ProgressCallback,
  ): Promise<Map<number, string>> {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-img-'));
    const tmpPdf = path.join(tmpDir, 'input.pdf');
    const outDir = path.join(tmpDir, 'output');

    try {
      await fs.mkdir(outDir, { recursive: true });
      await fs.writeFile(tmpPdf, pdfBuffer);

      const python = await findPython();
      console.log(`[PDF-Image] Running extraction: ${python} ${SCRIPT_PATH}`);
      console.log(`[PDF-Image] Exam: ${examNumber}, Output: ${outDir}`);

      const { stdout, stderr } = await runPythonWithProgress(
        python,
        [SCRIPT_PATH, tmpPdf, '--output', outDir, '--exam-id', String(examNumber)],
        onProgress,
      );

      if (stderr) console.log('[PDF-Image] stderr:', stderr);
      if (stdout) console.log('[PDF-Image] stdout:', stdout);

      // Read manifest
      const manifestPath = path.join(outDir, `exam-${examNumber}_manifest.json`);
      let manifest: { images: Array<{ question: number; type: string; description: string; file: string }> };
      try {
        const raw = await fs.readFile(manifestPath, 'utf-8');
        manifest = JSON.parse(raw);
      } catch {
        console.log('[PDF-Image] No manifest found, no images extracted');
        return new Map();
      }

      if (!manifest.images?.length) {
        console.log('[PDF-Image] No images in manifest');
        return new Map();
      }

      // Deduplicate: take first image per question number
      const uniqueImages = new Map<number, typeof manifest.images[0]>();
      for (const img of manifest.images) {
        if (!uniqueImages.has(img.question)) uniqueImages.set(img.question, img);
      }

      onProgress?.(`이미지 ${uniqueImages.size}개 R2 업로드 중...`);
      console.log(`[PDF-Image] Found ${manifest.images.length} images, uploading to R2...`);

      // Upload all images to R2 in parallel
      const result = new Map<number, string>();
      let uploadCount = 0;
      const total = uniqueImages.size;

      const uploadResults = await Promise.allSettled(
        [...uniqueImages.values()].map(async (img) => {
          const imgPath = path.join(outDir, img.file);
          const imgBuffer = await fs.readFile(imgPath);
          const url = await ImageService.save(imgBuffer, img.file);
          uploadCount++;
          onProgress?.(`R2 업로드: ${uploadCount}/${total}`);
          console.log(`[PDF-Image] Q${img.question}: ${img.type} → ${url}`);
          return { question: img.question, url };
        }),
      );

      for (const r of uploadResults) {
        if (r.status === 'fulfilled') {
          result.set(r.value.question, r.value.url);
        } else {
          console.error(`[PDF-Image] Upload failed:`, r.reason);
        }
      }

      console.log(`[PDF-Image] Uploaded ${result.size} images to R2`);
      return result;
    } finally {
      // Cleanup temp files
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch { /* ignore cleanup errors */ }
    }
  },
};
