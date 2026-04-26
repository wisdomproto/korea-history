#!/usr/bin/env node
/**
 * 카드뉴스 슬라이드 미리보기 — Puppeteer로 author-tool 카드뉴스 패널 캡처.
 * 한 노트의 6장 슬라이드를 모두 PNG로 저장.
 *
 * Usage: node scripts/preview-cardnews.mjs [noteId]
 *   noteId: s1-01 등 (기본 s5-01 — 짧은 제목 + 알찬 데이터)
 */
import puppeteer from 'puppeteer';
import fs from 'node:fs';

const NOTE_ID = process.argv[2] || 's5-01';
const OUT_DIR = `scripts/output/cardnews-preview/${NOTE_ID}`;
const APP = 'http://localhost:3001';

async function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1500, deviceScaleFactor: 2 });
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('[browser err]', m.text().slice(0, 200));
  });

  // 1. noteId → contentId 매핑
  const all = await (await fetch(`${APP}/api/contents`)).json();
  const list = Array.isArray(all) ? all : all.data || [];
  const c = list.find((x) => x.sourceId === NOTE_ID && x.projectId === 'proj-default');
  if (!c) throw new Error(`${NOTE_ID} contentId 못 찾음`);
  console.log(`노트: ${NOTE_ID} → 콘텐츠: ${c.id} (${c.title})`);

  await page.goto(APP, { waitUntil: 'networkidle2', timeout: 30000 });
  await wait(1500);

  // 2. 사이드바: 프로젝트 클릭 (한국사능력검정시험)
  console.log('프로젝트 클릭...');
  await page.evaluate(() => {
    const els = [...document.querySelectorAll('button, a, div')].filter(
      (el) => el.textContent?.includes('한국사능력검정시험') && el.children.length < 5
    );
    if (els[0]) (els[0]).click();
  });
  await wait(800);

  // 3. 마케팅 탭
  console.log('마케팅 탭 클릭...');
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('마케팅'));
    if (btn) btn.click();
  });
  await wait(800);

  // 4. 콘텐츠 생성 서브메뉴
  console.log('콘텐츠 생성 클릭...');
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button, a')].find(
      (b) => b.textContent?.includes('콘텐츠 생성')
    );
    if (btn) btn.click();
  });
  await wait(1500);

  // 5. 콘텐츠 리스트에서 해당 콘텐츠 클릭 — 검색창에 노트 ID 입력 후 첫 결과 클릭
  console.log(`콘텐츠 클릭 (${c.title})...`);
  await page.evaluate((noteIdSlug) => {
    const input = document.querySelector('input[placeholder*="검색"]');
    if (input) {
      input.focus();
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, noteIdSlug);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, c.title.split(' ')[0]); // "#01" 같은 prefix
  await wait(800);
  const clicked = await page.evaluate((titlePrefix) => {
    // 모든 div 중 textContent가 prefix로 시작하는 가장 작은(최하위) 클릭 가능 ancestor
    const all = [...document.querySelectorAll('div')];
    const candidates = all.filter((el) => {
      const t = (el.textContent || '').trim();
      return t.startsWith(titlePrefix) && t.length < 200;
    });
    // 가장 작은 (자식 적은) 후보 = 카드 자체
    candidates.sort((a, b) => a.textContent.length - b.textContent.length);
    for (const c of candidates) {
      const cls = c.className?.toString() || '';
      // cursor-pointer 또는 group 클래스 (Tailwind hover 패턴)
      if (cls.includes('cursor-pointer') || cls.includes('group')) {
        c.scrollIntoView({ block: 'center' });
        c.click();
        return { ok: true, text: c.textContent.trim().slice(0, 60), cls: cls.slice(0, 80) };
      }
    }
    // fallback: 그냥 첫 후보 클릭
    if (candidates[0]) {
      candidates[0].scrollIntoView({ block: 'center' });
      candidates[0].click();
      return { ok: true, fallback: true, text: candidates[0].textContent.trim().slice(0, 60) };
    }
    return { ok: false, candidates: candidates.length, allDivs: all.length };
  }, c.title.split(' ')[0]);
  console.log('  클릭 결과:', JSON.stringify(clicked));
  if (!clicked) console.log('  ⚠ 콘텐츠 클릭 못함');
  await wait(2500);

  // 6. 인스타그램 탭
  console.log('인스타그램 탭 클릭...');
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(
      (b) => b.textContent?.match(/인스타|카드뉴스|instagram/i) && b.textContent.length < 30
    );
    if (btn) btn.click();
  });
  await wait(3000);

  // 7. 6장 슬라이드 캡처 — 매번 미리보기 버튼 누르고 도트 인덱스로 점프
  console.log('미리보기 캡처...');
  for (let i = 0; i < 6; i++) {
    // 모달 열기 (첫 슬라이드는 미리보기 버튼, 이후는 도트 클릭)
    if (i === 0) {
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find(
          (b) => b.title?.includes('미리보기') || b.textContent?.includes('미리보기')
        );
        if (btn) btn.click();
      });
    } else {
      // 도트 클릭으로 i번째 슬라이드 점프
      await page.evaluate((idx) => {
        const dots = [...document.querySelectorAll('.fixed.inset-0.z-50 .w-2.h-2')];
        if (dots[idx]) dots[idx].click();
      }, i);
    }
    await wait(1200);

    // 모달 캔버스 800px 확장
    await page.evaluate(() => {
      const wrap = document.querySelector('.fixed.inset-0.z-50 > div');
      if (wrap) wrap.style.width = '800px';
    });
    await wait(1500);

    const canvas = await page.$('.fixed.inset-0.z-50 [class*="aspect-[4/5]"]');
    if (!canvas) { console.log(`  ✗ slide ${i + 1} 캔버스 못 찾음`); continue; }
    const path = `${OUT_DIR}/preview-${String(i + 1).padStart(2, '0')}.png`;
    await canvas.screenshot({ path });
    console.log(`  ✓ ${path}`);
  }
  // ESC로 모달 닫기
  await page.keyboard.press('Escape');
  await wait(300);

  // 디버깅용 전체 스크린샷
  await page.screenshot({ path: `${OUT_DIR}/_full.png`, fullPage: false });

  await browser.close();
  console.log('\n=== 완료 ===');
  console.log(`확인: explorer "${OUT_DIR.replace(/\//g, '\\')}"`);
}

main().catch((e) => { console.error('FAIL:', e); process.exit(1); });
