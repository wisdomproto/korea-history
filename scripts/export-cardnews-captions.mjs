#!/usr/bin/env node
/**
 * 87개 카드뉴스 캡션 + 해시태그 → CSV (Excel 호환).
 * UTF-8 BOM 포함 → 엑셀 한글 깨짐 방지.
 */
import fs from 'node:fs';

const APP = 'http://localhost:3001';
const OUT = 'scripts/output/cardnews-captions.csv';

function csvEscape(s) {
  if (s == null) return '';
  const str = String(s);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

async function main() {
  const all = await (await fetch(`${APP}/api/contents`)).json();
  const list = (Array.isArray(all) ? all : all.data || [])
    .filter((c) => c.projectId === 'proj-default' && c.sourceType === 'note')
    .sort((a, b) => a.title.localeCompare(b.title, 'ko-KR', { numeric: true }));

  console.log(`총 노트: ${list.length}`);

  const rows = [];
  rows.push(['번호', '노트ID', '제목', '시대', '캡션', '해시태그']);

  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    const num = String(i + 1).padStart(2, '0');
    process.stdout.write(`[${num}] `);
    try {
      const res = await fetch(`${APP}/api/contents/${c.id}`);
      const d = (await res.json()).data || {};
      const ig = (d.instagram || [])[0];
      const caption = ig?.caption || '';
      const tags = (ig?.hashtags || []).map((t) => '#' + t).join(' ');
      // 시대 추출 — 제목 형식: "#01 [삼국] 시대별 유물/유적지"
      const eraMatch = c.title.match(/\[([^\]]+)\]/);
      const era = eraMatch ? eraMatch[1] : '';
      const cleanTitle = c.title.replace(/^#\d+\s*\[[^\]]+\]\s*/, '').trim();
      rows.push([num, c.sourceId, cleanTitle, era, caption, tags]);
    } catch (e) {
      console.log(`✗ ${e.message}`);
    }
  }

  // UTF-8 BOM + CSV
  const csv = '﻿' + rows.map((r) => r.map(csvEscape).join(',')).join('\r\n');
  fs.writeFileSync(OUT, csv, 'utf8');
  console.log(`\n✅ CSV: ${OUT} (${list.length}행)`);
}

main().catch((e) => { console.error('FAIL:', e); process.exit(1); });
