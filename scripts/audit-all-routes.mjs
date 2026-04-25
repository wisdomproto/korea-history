#!/usr/bin/env node
/**
 * 전수 audit:
 *   1. 데이터 무결성 (slug 중복/특수문자/언밸런스 괄호)
 *   2. 모든 (examSlug, subjectSlug) 라우트 HTTP 응답
 */

import fs from 'node:fs';

const PORT = process.env.PORT || 3002;
const HOST = `http://localhost:${PORT}`;

const examData = JSON.parse(fs.readFileSync('data/exam-types/index.json', 'utf8'));
const subjData = JSON.parse(fs.readFileSync('data/subjects/index.json', 'utf8'));
const subjectsById = new Map(subjData.subjects.map((s) => [s.id, s]));

// ============================================
// 1. 데이터 무결성
// ============================================

const BAD_SLUG_CHAR = /[(){}<>·ㆍ.,'"\\\/\\s%#?&=]/;
const issues = [];

for (const x of subjData.subjects) {
  if (BAD_SLUG_CHAR.test(x.slug)) issues.push(['BAD_SLUG_SUBJ', x.id, x.slug]);
  if (!x.slug) issues.push(['EMPTY_SLUG_SUBJ', x.id]);
  const lp = (x.label.match(/\(/g) || []).length;
  const rp = (x.label.match(/\)/g) || []).length;
  if (lp !== rp) issues.push(['UNBALANCED_PAREN', x.id, x.label]);
  if (x.label.length > 30) issues.push(['LONG_LABEL', x.id, x.label]);
}

for (const e of examData.examTypes) {
  if (BAD_SLUG_CHAR.test(e.slug)) issues.push(['BAD_SLUG_EXAM', e.id, e.slug]);
}

const subjSlugCount = {};
for (const x of subjData.subjects) subjSlugCount[x.slug] = (subjSlugCount[x.slug] || 0) + 1;
const subjDups = Object.entries(subjSlugCount).filter(([_, v]) => v > 1);

const examSlugCount = {};
for (const e of examData.examTypes) examSlugCount[e.slug] = (examSlugCount[e.slug] || 0) + 1;
const examDups = Object.entries(examSlugCount).filter(([_, v]) => v > 1);

console.log('=== 데이터 이슈 ===');
const grouped = {};
for (const i of issues) grouped[i[0]] = (grouped[i[0]] || 0) + 1;
for (const [k, v] of Object.entries(grouped)) console.log(' ', k.padEnd(25), v);
console.log('  중복 SUBJ_SLUG'.padEnd(28), subjDups.length);
console.log('  중복 EXAM_SLUG'.padEnd(28), examDups.length);

console.log('\n--- BAD_SLUG_SUBJ 샘플 (URL 깨질 위험) ---');
issues
  .filter((i) => i[0] === 'BAD_SLUG_SUBJ')
  .slice(0, 10)
  .forEach((i) => console.log(' ', i[2]));

console.log('\n--- UNBALANCED_PAREN 샘플 (라벨 깨짐) ---');
issues
  .filter((i) => i[0] === 'UNBALANCED_PAREN')
  .slice(0, 10)
  .forEach((i) => console.log(' ', i[2]));

// ============================================
// 2. HTTP probe (모든 (examSlug, subjectSlug) 조합)
// ============================================

if (process.argv.includes('--http')) {
  console.log(`\n=== HTTP probe @ ${HOST} ===`);
  const targets = [];
  for (const e of examData.examTypes) {
    targets.push({ kind: 'exam', url: `/${encodeURIComponent(e.slug)}`, label: e.slug });
    for (const r of [...e.subjects.required, ...(e.subjects.selectable || [])]) {
      const subj = subjectsById.get(r.subjectId);
      if (!subj) continue;
      const url = `/${encodeURIComponent(e.slug)}/${encodeURIComponent(subj.slug)}`;
      targets.push({ kind: 'subj', url, label: `${e.slug}/${subj.slug}` });
    }
  }
  console.log(`총 라우트: ${targets.length}`);

  // 동시성 제한
  const CONCURRENCY = 10;
  const failed = [];
  let done = 0;
  let printedCount = 0;

  async function probe(t) {
    try {
      const r = await fetch(`${HOST}${t.url}`, { method: 'GET' });
      done++;
      if (r.status >= 400) failed.push({ ...t, status: r.status });
      if (done % 50 === 0) console.log(`  진행: ${done}/${targets.length} (실패 ${failed.length})`);
    } catch (e) {
      done++;
      failed.push({ ...t, status: 'ERR', err: e.message });
    }
  }

  const queue = [...targets];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const t = queue.shift();
      await probe(t);
    }
  });
  await Promise.all(workers);

  console.log(`\n=== HTTP 결과 ===`);
  console.log(`성공: ${targets.length - failed.length} / ${targets.length}`);
  console.log(`실패: ${failed.length}`);
  if (failed.length) {
    const byStatus = {};
    for (const f of failed) byStatus[f.status] = (byStatus[f.status] || 0) + 1;
    console.log('상태별:');
    for (const [k, v] of Object.entries(byStatus)) console.log(' ', k, v);
    console.log('\n--- 샘플 실패 (최대 30) ---');
    failed.slice(0, 30).forEach((f) => console.log(`  ${f.status}  ${f.url}`));
  }
}
