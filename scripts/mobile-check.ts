import puppeteer from 'puppeteer';
import fs from 'fs';

const pages = [
  { name: 'main', url: 'https://gcnote.co.kr' },
  { name: 'exam-list', url: 'https://gcnote.co.kr/exam' },
  { name: 'exam-77', url: 'https://gcnote.co.kr/exam/77' },
  { name: 'question', url: 'https://gcnote.co.kr/exam/77/1' },
  { name: 'notes-index', url: 'https://gcnote.co.kr/notes' },
  { name: 'notes-detail', url: 'https://gcnote.co.kr/notes/s3-01' },
  { name: 'study', url: 'https://gcnote.co.kr/study' },
];

async function main() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)');

  fs.mkdirSync('scripts/output/mobile-check', { recursive: true });

  for (const p of pages) {
    console.log(`Capturing ${p.name}...`);
    await page.goto(p.url, { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: `scripts/output/mobile-check/${p.name}.png`, fullPage: true });
  }

  await browser.close();
  console.log('Done!');
}
main().catch(e => { console.error(e); process.exit(1); });
