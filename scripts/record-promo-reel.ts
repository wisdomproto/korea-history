/**
 * Record Instagram Reel promo video by automating gcnote.co.kr
 *
 * Usage: npx tsx scripts/record-promo-reel.ts
 * Output: scripts/output/promo-reel.mp4 (9:16, 1080x1920, ~30s)
 *
 * Requires: puppeteer, puppeteer-screen-recorder, ffmpeg
 */

import puppeteer from 'puppeteer';
import { PuppeteerScreenRecorder } from 'puppeteer-screen-recorder';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, 'output');
const RAW_VIDEO = path.join(OUTPUT_DIR, 'promo-raw.mp4');
const FINAL_VIDEO = path.join(OUTPUT_DIR, 'promo-reel.mp4');
const SITE_URL = 'https://gcnote.co.kr';

// 9:16 viewport (mobile-like for vertical video)
const WIDTH = 430;   // CSS pixels (will be scaled to 1080px)
const HEIGHT = 932;  // CSS pixels (will be scaled to 1920px + extra for scrolling)
const DEVICE_SCALE = 2.5; // 430 * 2.5 = 1075 ≈ 1080

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

// Inject a visible cursor overlay into the page
async function injectCursor(page: puppeteer.Page) {
  await page.evaluate(`(() => {
    if (document.getElementById('fake-cursor')) return;
    const cursor = document.createElement('div');
    cursor.id = 'fake-cursor';
    cursor.style.cssText = 'position:fixed;top:0;left:0;width:24px;height:24px;background:rgba(59,130,246,0.5);border:2px solid #3b82f6;border-radius:50%;pointer-events:none;z-index:999999;transition:top 0.3s ease,left 0.3s ease;transform:translate(-50%,-50%);box-shadow:0 0 12px rgba(59,130,246,0.4);';
    document.body.appendChild(cursor);
    // Click ripple effect
    const ripple = document.createElement('div');
    ripple.id = 'cursor-ripple';
    ripple.style.cssText = 'position:fixed;top:0;left:0;width:40px;height:40px;border:2px solid #3b82f6;border-radius:50%;pointer-events:none;z-index:999998;transform:translate(-50%,-50%) scale(0);opacity:0;';
    document.body.appendChild(ripple);
  })()`);
}

// Move the fake cursor smoothly to target coordinates
async function moveCursor(page: puppeteer.Page, x: number, y: number) {
  await page.evaluate(`(() => {
    const c = document.getElementById('fake-cursor');
    if (c) { c.style.top = '${y}px'; c.style.left = '${x}px'; }
  })()`);
  await sleep(350);
}

// Show a click ripple effect at current cursor position
async function clickEffect(page: puppeteer.Page) {
  await page.evaluate(`(() => {
    const c = document.getElementById('fake-cursor');
    const r = document.getElementById('cursor-ripple');
    if (!c || !r) return;
    r.style.top = c.style.top;
    r.style.left = c.style.left;
    r.style.transition = 'none';
    r.style.transform = 'translate(-50%,-50%) scale(0)';
    r.style.opacity = '1';
    requestAnimationFrame(() => {
      r.style.transition = 'transform 0.4s ease-out, opacity 0.4s ease-out';
      r.style.transform = 'translate(-50%,-50%) scale(1.5)';
      r.style.opacity = '0';
    });
  })()`);
  await sleep(150);
}

// Click an element with visible cursor movement + ripple
async function tapElement(page: puppeteer.Page, selector: string) {
  const el = await page.$(selector);
  if (!el) return false;
  const box = await el.boundingBox();
  if (!box) return false;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await moveCursor(page, x, y);
  await clickEffect(page);
  await el.click();
  return true;
}

async function smoothScroll(page: puppeteer.Page, distance: number, duration: number = 800) {
  await page.evaluate(`(async () => {
    const dist = ${distance};
    const dur = ${duration};
    const start = window.scrollY;
    const startTime = Date.now();
    await new Promise((resolve) => {
      const step = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / dur, 1);
        const eased = progress < 0.5
          ? 2 * progress * progress
          : -1 + (4 - 2 * progress) * progress;
        window.scrollTo(0, start + dist * eased);
        if (progress < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  })()`);
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  console.log('🎬 Recording promo reel...\n');

  const browser = await puppeteer.launch({
    headless: false,  // Show browser for debugging; set to 'new' for headless
    defaultViewport: {
      width: WIDTH,
      height: HEIGHT,
      deviceScaleFactor: DEVICE_SCALE,
    },
    args: [
      `--window-size=${WIDTH},${HEIGHT}`,
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  });

  const page = await browser.newPage();

  // Mobile user agent
  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');

  // Start recording
  const recorder = new PuppeteerScreenRecorder(page, {
    followNewTab: false,
    fps: 30,
    videoFrame: {
      width: 1080,
      height: 1920,
    },
    aspectRatio: '9:16',
  });

  await recorder.start(RAW_VIDEO);
  console.log('  📹 Recording started\n');

  // Helper: navigate with cursor animation
  async function navigateTo(url: string, cursorX: number, cursorY: number) {
    await moveCursor(page, cursorX, cursorY);
    await clickEffect(page);
    await sleep(300);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
    await injectCursor(page);
  }

  // ═══ Scene 1: Main page (0~3s) ═══
  console.log('  [1] 메인 페이지...');
  await page.goto(SITE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await injectCursor(page);
  await sleep(800);
  await moveCursor(page, 215, 400);
  await smoothScroll(page, 200, 800);
  await sleep(800);

  // ═══ Scene 2: Exam list page (3~6s) ═══
  console.log('  [2] 시험 목록...');
  await navigateTo(`${SITE_URL}/exam`, 215, 350);
  await sleep(800);
  await smoothScroll(page, 100, 500);
  await sleep(600);

  // ═══ Scene 3: Click 77회 (6~9s) ═══
  console.log('  [3] 77회 시험...');
  await navigateTo(`${SITE_URL}/exam/77`, 215, 250);
  await sleep(1000);

  // ═══ Scene 4: Click question 1 (9~12s) ═══
  console.log('  [4] 1번 문제...');
  await navigateTo(`${SITE_URL}/exam/77/1`, 215, 200);
  await sleep(800);
  await smoothScroll(page, 150, 500);
  await sleep(600);

  // ═══ Scene 5: Answer question (12~16s) ═══
  console.log('  [5] 선지 클릭...');
  try {
    const choices = await page.$$('button[class*="choice"], [class*="선지"], [data-choice]');
    if (choices.length >= 3) {
      const box = await choices[2].boundingBox();
      if (box) {
        await moveCursor(page, box.x + box.width / 2, box.y + box.height / 2);
        await clickEffect(page);
        await sleep(200);
        await choices[2].click();
      }
    }
  } catch {}
  await sleep(2500);

  // ═══ Scene 6: Scroll to explanation (16~20s) ═══
  console.log('  [6] 해설...');
  await moveCursor(page, 215, 600);
  await smoothScroll(page, 300, 600);
  await sleep(1200);
  await smoothScroll(page, 200, 500);
  await sleep(1200);

  // ═══ Scene 7: Summary notes (20~26s) ═══
  console.log('  [7] 요약노트...');
  await navigateTo(`${SITE_URL}/notes/s3-01`, 215, 700);
  await sleep(800);
  await moveCursor(page, 215, 400);
  await smoothScroll(page, 300, 600);
  await sleep(1200);
  await smoothScroll(page, 200, 500);
  await sleep(800);

  // ═══ Scene 8: CTA (26~30s) ═══
  console.log('  [8] CTA...');
  await navigateTo(SITE_URL, 215, 500);
  await sleep(2000);

  // Stop recording
  await recorder.stop();
  console.log('\n  📹 Recording stopped');

  await browser.close();

  // Post-process with ffmpeg: trim to 30s, ensure 9:16
  console.log('\n  🎞️ Post-processing with ffmpeg...');
  const { execSync } = await import('child_process');
  try {
    execSync(`ffmpeg -y -i "${RAW_VIDEO}" -t 30 -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black" -c:v libx264 -preset fast -crf 23 -an "${FINAL_VIDEO}"`, { stdio: 'inherit' });
    console.log(`\n✅ Done! ${FINAL_VIDEO}`);
  } catch (err) {
    console.log(`\n⚠️ ffmpeg failed. Raw video at: ${RAW_VIDEO}`);
  }
}

main().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
