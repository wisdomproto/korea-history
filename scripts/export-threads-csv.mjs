#!/usr/bin/env node
/**
 * data/threads-drafts/2026-04-27-batch-50.md → CSV (Excel UTF-8 BOM).
 * 컬럼: 번호 | 카테고리 | 본문 | 링크포함 | 글자수 | 메모
 */
import fs from 'node:fs';

const SRC = 'data/threads-drafts/2026-04-27-batch-50.md';
const OUT = 'data/threads-drafts/threads-batch-57.csv';

const md = fs.readFileSync(SRC, 'utf8');

// 카테고리 헤더 → 번호 매핑
const sections = [
  { from: 1,  to: 15, name: '빌더 일지' },
  { from: 16, to: 35, name: '한국사 한 입' },
  { from: 36, to: 45, name: '수험생 공감' },
  { from: 46, to: 50, name: '데이터·발견' },
  { from: 51, to: 57, name: '공무원 확장' },
];
const categoryOf = (n) => sections.find((s) => n >= s.from && n <= s.to)?.name || '';

// `### N` ~ 다음 `### ` 또는 `---` 까지가 본문
const posts = [];
const re = /^### (\d+)\s*\n([\s\S]*?)(?=^### \d+|^---|^## )/gm;
let m;
while ((m = re.exec(md)) !== null) {
  const num = parseInt(m[1], 10);
  const body = m[2].trim();
  posts.push({ num, body });
}
posts.sort((a, b) => a.num - b.num);

function csvEscape(s) {
  if (s == null) return '';
  const str = String(s);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

const rows = [['번호', '카테고리', '본문', '링크포함', '글자수', '메모']];
for (const p of posts) {
  const hasLink = p.body.includes('gcnote.co.kr') || p.body.includes('→ gcnote');
  const len = [...p.body].length;
  rows.push([
    String(p.num).padStart(2, '0'),
    categoryOf(p.num),
    p.body,
    hasLink ? 'Y' : '',
    len,
    '',
  ]);
}

const csv = '﻿' + rows.map((r) => r.map(csvEscape).join(',')).join('\r\n');
fs.writeFileSync(OUT, csv, 'utf8');
console.log(`✅ CSV: ${OUT} (${posts.length}행)`);
