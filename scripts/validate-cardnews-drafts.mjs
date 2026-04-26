#!/usr/bin/env node
/**
 * 87개 카드뉴스 드래프트 자동 검증
 *  - 스키마 완성도
 *  - 글자수 한도
 *  - 항목 개수
 *  - 시대(era) 일관성
 *  - noteTitle ↔ index.json 매칭
 *  - imagePrompt 'NO TEXT' 포함 여부
 */
import fs from 'node:fs';
import path from 'node:path';

const DRAFTS = 'data/cardnews-drafts';
const INDEX = JSON.parse(fs.readFileSync('data/notes/index.json', 'utf8'));
const noteMap = new Map(INDEX.map((n) => [n.id, n]));

const SECTION_ERA = {
  s1: '삼국', s2: '고려', s3: '조선 전기', s4: '조선 후기',
  s5: '근대', s6: '일제 강점기', s7: '현대',
};

// 글자수 한도
const LIMITS = {
  'cover.title_lines[i]': 4,        // 2-3 chars 권장, 4까지 허용
  'cover.subtitle.line': 28,        // 25 권장
  'keywords.items[i].word': 5,      // 4 chars 권장
  'keywords.items[i].sub': 22,      // 18 chars 권장
  'facts.timeline[i].text': 40,     // 35 chars 권장
  'people.items[i].role': 12,       // 8 chars 권장
  'people.items[i].desc': 35,       // 30 chars 권장
  'impact.items[i].title': 14,      // 10 chars 권장
  'impact.items[i].desc': 30,       // 25 chars 권장
};

const issues = []; // { noteId, severity, field, message }

function add(noteId, severity, field, message) {
  issues.push({ noteId, severity, field, message });
}

function len(s) { return [...(s || '')].length; }

function check(noteId, draft) {
  const idxNote = noteMap.get(noteId);
  if (!idxNote) return add(noteId, 'error', 'noteId', `index.json에 없음`);

  // 1. noteTitle 매칭
  if (draft.noteTitle?.trim() !== idxNote.title?.trim()) {
    add(noteId, 'warn', 'noteTitle', `노트 제목 불일치: "${draft.noteTitle}" ≠ "${idxNote.title}"`);
  }

  // 2. era 일관성
  const expectedEra = SECTION_ERA[idxNote.sectionId];
  if (draft.data?.meta?.era !== expectedEra) {
    add(noteId, 'warn', 'data.meta.era', `era 불일치: "${draft.data?.meta?.era}" (예상: "${expectedEra}")`);
  }

  // 3. 스키마 필수 필드
  const d = draft.data;
  if (!d) return add(noteId, 'error', 'data', `data 필드 없음`);
  for (const key of ['meta', 'cover', 'keywords', 'facts', 'people', 'impact', 'outro']) {
    if (!d[key]) add(noteId, 'error', `data.${key}`, `필수 필드 없음`);
  }

  // 4. cover
  if (d.cover) {
    const tl = d.cover.title_lines || [];
    if (tl.length !== 2) add(noteId, 'warn', 'cover.title_lines', `2개 필요 (${tl.length}개)`);
    tl.forEach((s, i) => {
      if (len(s) > LIMITS['cover.title_lines[i]']) add(noteId, 'warn', `cover.title_lines[${i}]`, `${len(s)}자 ("${s}", 권장 3자)`);
    });
    const sub = (d.cover.subtitle || '').split('\n');
    sub.forEach((line, i) => {
      if (len(line) > LIMITS['cover.subtitle.line']) add(noteId, 'warn', `cover.subtitle line ${i+1}`, `${len(line)}자 ("${line}", 권장 25자)`);
    });
    if (!d.cover.imagePrompt) add(noteId, 'error', 'cover.imagePrompt', `없음`);
    else if (!d.cover.imagePrompt.includes('NO TEXT')) add(noteId, 'warn', 'cover.imagePrompt', `'NO TEXT' 누락`);
  }

  // 5. keywords (4개 필수)
  if (d.keywords) {
    const items = d.keywords.items || [];
    if (items.length !== 4) add(noteId, 'warn', 'keywords.items', `4개 필요 (${items.length}개)`);
    items.forEach((it, i) => {
      if (len(it.word) > LIMITS['keywords.items[i].word']) add(noteId, 'warn', `keywords[${i}].word`, `${len(it.word)}자 ("${it.word}", 권장 4자)`);
      if (len(it.sub) > LIMITS['keywords.items[i].sub']) add(noteId, 'warn', `keywords[${i}].sub`, `${len(it.sub)}자 ("${it.sub}", 권장 18자)`);
    });
  }

  // 6. facts (timeline 4개 필수)
  if (d.facts) {
    const tl = d.facts.timeline || [];
    if (tl.length !== 4) add(noteId, 'warn', 'facts.timeline', `4개 필요 (${tl.length}개)`);
    tl.forEach((it, i) => {
      if (len(it.text) > LIMITS['facts.timeline[i].text']) add(noteId, 'warn', `facts.timeline[${i}].text`, `${len(it.text)}자 ("${it.text}", 권장 35자)`);
    });
  }

  // 7. people (3개 필수)
  if (d.people) {
    const items = d.people.items || [];
    if (items.length !== 3) add(noteId, 'warn', 'people.items', `3개 필요 (${items.length}개)`);
    items.forEach((it, i) => {
      if (len(it.role) > LIMITS['people.items[i].role']) add(noteId, 'warn', `people[${i}].role`, `${len(it.role)}자 ("${it.role}", 권장 8자)`);
      if (len(it.desc) > LIMITS['people.items[i].desc']) add(noteId, 'warn', `people[${i}].desc`, `${len(it.desc)}자 ("${it.desc}", 권장 30자)`);
    });
  }

  // 8. impact (4개 필수)
  if (d.impact) {
    const items = d.impact.items || [];
    if (items.length !== 4) add(noteId, 'warn', 'impact.items', `4개 필요 (${items.length}개)`);
    items.forEach((it, i) => {
      if (len(it.title) > LIMITS['impact.items[i].title']) add(noteId, 'warn', `impact[${i}].title`, `${len(it.title)}자 ("${it.title}", 권장 10자)`);
      if (len(it.desc) > LIMITS['impact.items[i].desc']) add(noteId, 'warn', `impact[${i}].desc`, `${len(it.desc)}자 ("${it.desc}", 권장 25자)`);
    });
  }

  // 9. outro
  if (d.outro) {
    if (!d.outro.tip_headline) add(noteId, 'warn', 'outro.tip_headline', `없음`);
    if (!d.outro.tip_body) add(noteId, 'warn', 'outro.tip_body', `없음`);
    if (!d.outro.imagePrompt) add(noteId, 'warn', 'outro.imagePrompt', `없음`);
    else if (!d.outro.imagePrompt.includes('NO TEXT')) add(noteId, 'warn', 'outro.imagePrompt', `'NO TEXT' 누락`);
  }
}

const files = fs.readdirSync(DRAFTS).filter((f) => /^s\d/.test(f) && f.endsWith('.json'));
files.sort();
console.log(`드래프트: ${files.length}개\n`);

for (const f of files) {
  const noteId = f.replace('.json', '');
  try {
    const draft = JSON.parse(fs.readFileSync(path.join(DRAFTS, f), 'utf8'));
    check(noteId, draft);
  } catch (e) {
    add(noteId, 'error', 'parse', `JSON parse 실패: ${e.message}`);
  }
}

// 출력 — 노트별 그룹
const byNote = new Map();
for (const i of issues) {
  if (!byNote.has(i.noteId)) byNote.set(i.noteId, []);
  byNote.get(i.noteId).push(i);
}

const errors = issues.filter((i) => i.severity === 'error');
const warns = issues.filter((i) => i.severity === 'warn');

console.log(`=== 요약 ===`);
console.log(`전체: ${files.length}개 드래프트`);
console.log(`이슈 있음: ${byNote.size}개`);
console.log(`에러: ${errors.length}건, 경고: ${warns.length}건\n`);

// 카테고리별 통계
const byField = new Map();
for (const i of warns) {
  const cat = i.field.replace(/\[\d+\]/g, '[]').replace(/line \d+/, 'line N');
  byField.set(cat, (byField.get(cat) || 0) + 1);
}
console.log(`=== 경고 카테고리별 빈도 ===`);
[...byField.entries()].sort((a, b) => b[1] - a[1]).forEach(([f, c]) => {
  console.log(`  ${c.toString().padStart(3)} × ${f}`);
});

// 노트별 상세
console.log(`\n=== 노트별 상세 ===`);
const sortedNotes = [...byNote.keys()].sort();
for (const noteId of sortedNotes) {
  const items = byNote.get(noteId);
  const e = items.filter((i) => i.severity === 'error').length;
  const w = items.filter((i) => i.severity === 'warn').length;
  console.log(`\n[${noteId}] 에러 ${e}, 경고 ${w}`);
  for (const i of items) {
    const tag = i.severity === 'error' ? '✗' : '⚠';
    console.log(`  ${tag} ${i.field}: ${i.message}`);
  }
}

if (errors.length === 0) {
  console.log(`\n✅ 에러 0건 — 모두 파싱 가능, 필수 필드 충족`);
}
