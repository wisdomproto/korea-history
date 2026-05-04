import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

/**
 * 투자자 데크 시각 검증 — 18장 모두 1600x900 PNG로 캡처해 글자 잘림/넘침 자체 확인.
 * 출력 → scripts/output/investor-deck-check/slide-NN.png
 */

const TOTAL_SLIDES = 20;

async function main() {
  const htmlPath = path.resolve('docs/investor-deck-v1.html');
  const fileUrl = `file:///${htmlPath.replace(/\\/g, '/')}`;

  const outDir = path.resolve('scripts/output/investor-deck-check');
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1.25 });
  await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });
  // Wait for Korean fonts (Noto Serif KR + Pretendard + JetBrains Mono) and Chart.js
  await page.evaluate(() => (document as Document & { fonts: { ready: Promise<unknown> } }).fonts.ready);
  await new Promise(r => setTimeout(r, 3500));

  for (let i = 1; i <= TOTAL_SLIDES; i++) {
    if (i > 1) {
      await page.keyboard.press('ArrowRight');
    }
    // Wait for slide animation (0.35s) + Chart.js resize (0.45s) + safety margin
    await new Promise(r => setTimeout(r, 1800));

    const out = path.join(outDir, `slide-${String(i).padStart(2, '0')}.png`);
    await page.screenshot({ path: out, fullPage: false });
    console.log(`slide ${String(i).padStart(2, '0')} → ${path.basename(out)}`);
  }

  await browser.close();
  console.log(`done — ${TOTAL_SLIDES} slides captured to ${outDir}`);
}

main().catch(e => { console.error(e); process.exit(1); });
