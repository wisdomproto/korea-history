import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { ImageService } from './image.service.js';

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

      const { stdout, stderr } = await execFileAsync(
        python,
        [SCRIPT_PATH, tmpPdf, '--output', outDir, '--exam-id', String(examNumber)],
        { timeout: TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 },
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

      console.log(`[PDF-Image] Found ${manifest.images.length} images, uploading to R2...`);

      // Deduplicate: take first image per question number
      const uniqueImages = new Map<number, typeof manifest.images[0]>();
      for (const img of manifest.images) {
        if (!uniqueImages.has(img.question)) uniqueImages.set(img.question, img);
      }

      // Upload all images to R2 in parallel
      const result = new Map<number, string>();
      const uploadResults = await Promise.allSettled(
        [...uniqueImages.values()].map(async (img) => {
          const imgPath = path.join(outDir, img.file);
          const imgBuffer = await fs.readFile(imgPath);
          const url = await ImageService.save(imgBuffer, img.file);
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
