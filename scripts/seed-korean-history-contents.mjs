#!/usr/bin/env node
/**
 * 한능검 (proj-default) 콘텐츠 시드:
 *   1. 기존 콘텐츠 (proj-default + projectId 없음) 모두 삭제
 *   2. 87개 노트 → 시대순으로 87개 콘텐츠 자동 생성
 *
 * Usage: node scripts/seed-korean-history-contents.mjs
 *   (저작도구 dev 서버가 3001에서 실행 중이어야 함)
 */

const API = 'http://localhost:3001/api';
const PROJECT_ID = 'proj-default';

const ERA_ORDER = ['삼국', '고려', '조선 전기', '조선 후기', '근대', '현대'];

async function main() {
  // 1. 기존 컨텐츠 삭제
  console.log('=== Step 1: 기존 컨텐츠 삭제 ===');
  const allContents = await fetch(`${API}/contents`).then((r) => r.json());
  const list = Array.isArray(allContents) ? allContents : allContents.data || [];
  const toDelete = list.filter((c) => c.projectId === PROJECT_ID || !c.projectId);
  console.log(`삭제 대상: ${toDelete.length}개`);
  for (const c of toDelete) {
    const res = await fetch(`${API}/contents/${c.id}`, { method: 'DELETE' });
    console.log(`  ${res.ok ? '✓' : '✗'} ${c.id} (${c.title || 'no title'})`);
  }

  // 2. 87개 노트 가져오기
  console.log('\n=== Step 2: 87 노트 가져오기 ===');
  const notes = await fetch(`${API}/notes`).then((r) => r.json());
  const noteList = Array.isArray(notes) ? notes : notes.data || [];
  console.log(`노트: ${noteList.length}개`);

  // 시대순 + 노트 order로 정렬
  const sorted = [...noteList].sort((a, b) => {
    const aIdx = ERA_ORDER.indexOf(a.era);
    const bIdx = ERA_ORDER.indexOf(b.era);
    const aRank = aIdx === -1 ? 999 : aIdx;
    const bRank = bIdx === -1 ? 999 : bIdx;
    if (aRank !== bRank) return aRank - bRank;
    return (a.order ?? 0) - (b.order ?? 0);
  });

  // 3. 컨텐츠 생성
  console.log('\n=== Step 3: 87 콘텐츠 자동 생성 ===');
  let created = 0;
  for (let i = 0; i < sorted.length; i++) {
    const n = sorted[i];
    const num = String(i + 1).padStart(2, '0');
    const title = `#${num} [${n.era}] ${n.title}`;
    const res = await fetch(`${API}/contents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        sourceType: 'note',
        sourceId: n.id,
        projectId: PROJECT_ID,
      }),
    });
    if (res.ok) {
      created++;
      if ((i + 1) % 10 === 0) console.log(`  진행: ${i + 1}/${sorted.length}`);
    } else {
      const err = await res.text();
      console.log(`  ✗ ${title} — ${err.slice(0, 100)}`);
    }
  }
  console.log(`\n=== 완료 ===`);
  console.log(`생성된 콘텐츠: ${created}/${sorted.length}`);
}

main().catch((e) => {
  console.error('FAIL:', e);
  process.exit(1);
});
