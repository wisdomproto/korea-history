#!/usr/bin/env node
/**
 * 87개 카드뉴스 전체 PNG 다운로드 + zip.
 *  - 각 노트 = 6장 슬라이드
 *  - 모달 캔버스 1080px 확장 → IG 스펙 1080×1350 PNG
 *  - 출력: scripts/output/cardnews-export/{NN}_{title}/sl-XX.png
 *  - 마지막에 zip
 *
 * Usage: node scripts/batch-export-cardnews.mjs [start] [end]
 *   start, end: 부분 범위 (1~87) — 디버깅용
 */
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const APP = 'http://localhost:3001';
const OUT = 'scripts/output/cardnews-export';
const ZIP_PATH = 'scripts/output/cardnews-87.zip';
const START = parseInt(process.argv[2] || '1', 10);
const END = parseInt(process.argv[3] || '87', 10);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function sanitize(s) {
  return s.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '-').slice(0, 50);
}

async function captureCard(page, content, idx) {
  const dir = path.join(OUT, `${String(idx).padStart(2, '0')}_${sanitize(content.title.replace(/^#\d+\s*/, ''))}`);
  fs.mkdirSync(dir, { recursive: true });

  // 1. 콘텐츠 검색 + 클릭
  await page.evaluate((title) => {
    const input = document.querySelector('input[placeholder*="검색"]');
    if (input) {
      input.focus();
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, title.split(' ')[0]);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, content.title);
  await wait(600);

  await page.evaluate((titlePrefix) => {
    const all = [...document.querySelectorAll('div')];
    const candidates = all.filter((el) => {
      const t = (el.textContent || '').trim();
      return t.startsWith(titlePrefix) && t.length < 200;
    });
    candidates.sort((a, b) => a.textContent.length - b.textContent.length);
    for (const c of candidates) {
      const cls = c.className?.toString() || '';
      if (cls.includes('cursor-pointer') || cls.includes('group')) {
        c.scrollIntoView({ block: 'center' });
        c.click();
        return;
      }
    }
  }, content.title.split(' ')[0]);
  await wait(2000);

  // 2. 인스타그램 탭 클릭
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(
      (b) => b.textContent?.match(/인스타|카드뉴스|instagram/i) && b.textContent.length < 30
    );
    if (btn) btn.click();
  });
  await wait(2500);

  // 3. 6장 슬라이드 캡처 — 매번 모달 다시 열기 (race 회피)
  for (let i = 0; i < 6; i++) {
    if (i === 0) {
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find(
          (b) => b.title?.includes('미리보기') || b.textContent?.includes('미리보기')
        );
        if (btn) btn.click();
      });
    } else {
      await page.evaluate((idx) => {
        const dots = [...document.querySelectorAll('.fixed.inset-0.z-50 .w-2.h-2')];
        if (dots[idx]) dots[idx].click();
      }, i);
    }
    await wait(1200);

    // 모달 800px → 1080px 확장 (IG 스펙)
    await page.evaluate(() => {
      const wrap = document.querySelector('.fixed.inset-0.z-50 > div');
      if (wrap) wrap.style.width = '1080px';
    });
    await wait(1800);

    const canvas = await page.$('.fixed.inset-0.z-50 [class*="aspect-[4/5]"]');
    if (!canvas) {
      console.log(`  ✗ slide ${i + 1} not found`);
      continue;
    }
    const file = path.join(dir, `${String(i + 1).padStart(2, '0')}.png`);
    await canvas.screenshot({ path: file });
    process.stdout.write('.');
  }

  // 4. 모달 닫기 + 검색 초기화
  await page.keyboard.press('Escape');
  await wait(300);
  await page.evaluate(() => {
    const input = document.querySelector('input[placeholder*="검색"]');
    if (input) {
      input.focus();
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, '');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await wait(500);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  // 콘텐츠 리스트 fetch
  const all = await (await fetch(`${APP}/api/contents`)).json();
  const list = (Array.isArray(all) ? all : all.data || [])
    .filter((c) => c.projectId === 'proj-default' && c.sourceType === 'note')
    .sort((a, b) => a.title.localeCompare(b.title, 'ko-KR', { numeric: true }));

  console.log(`총 노트: ${list.length}, 범위: ${START}~${END}`);

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1500, deviceScaleFactor: 1 });

  // 첫 페이지 로드 + 프로젝트 → 마케팅 → 콘텐츠 생성 (한 번만)
  await page.goto(APP, { waitUntil: 'networkidle2', timeout: 30000 });
  await wait(1500);
  await page.evaluate(() => {
    const els = [...document.querySelectorAll('button, a, div')].filter(
      (el) => el.textContent?.includes('한국사능력검정시험') && el.children.length < 5
    );
    if (els[0]) els[0].click();
  });
  await wait(800);
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('마케팅'));
    if (btn) btn.click();
  });
  await wait(800);
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button, a')].find((b) => b.textContent?.includes('콘텐츠 생성'));
    if (btn) btn.click();
  });
  await wait(1500);

  const t0 = Date.now();
  for (let i = START - 1; i < END && i < list.length; i++) {
    const c = list[i];
    const num = i + 1;
    process.stdout.write(`[${num}/${list.length}] ${c.title.slice(0, 40)} `);
    try {
      await captureCard(page, c, num);
      console.log(` ✓ (${Math.round((Date.now() - t0) / 1000)}s)`);
    } catch (e) {
      console.log(` ✗ ${e.message}`);
    }
  }

  await browser.close();
  console.log(`\n캡처 완료. zip 생성...`);

  // PowerShell의 Compress-Archive 사용 (cross-platform)
  try {
    fs.rmSync(ZIP_PATH, { force: true });
    execSync(`powershell -Command "Compress-Archive -Path '${OUT}/*' -DestinationPath '${ZIP_PATH}' -Force"`, { stdio: 'inherit' });
    console.log(`✅ zip: ${ZIP_PATH}`);
  } catch (e) {
    console.log(`zip 생성 실패: ${e.message}`);
  }
}

main().catch((e) => { console.error('FAIL:', e); process.exit(1); });
