#!/usr/bin/env node
/**
 * 한능검 (proj-default) 87개 컨텐츠의 baseArticle을 노트 데이터로 채움.
 *   - html: note.content (이미 HTML)
 *   - keywords: note.relatedKeywords
 *   - summary: note.title (간결)
 *
 * Usage: node scripts/fill-baseArticle-from-notes.mjs
 */

const API = 'http://localhost:3001/api';
const PROJECT_ID = 'proj-default';

async function main() {
  // 1. 한능검 컨텐츠 가져오기
  console.log('=== 한능검 컨텐츠 fetch ===');
  const all = await fetch(`${API}/contents`).then((r) => r.json());
  const list = Array.isArray(all) ? all : all.data || [];
  const targets = list.filter(
    (c) => c.projectId === PROJECT_ID && c.sourceType === 'note' && c.sourceId,
  );
  console.log(`대상: ${targets.length}개`);

  // 2. 각 컨텐츠 → 노트 fetch → baseArticle 저장
  let done = 0;
  let skip = 0;
  for (let i = 0; i < targets.length; i++) {
    const c = targets[i];
    try {
      // 이미 채워져있으면 skip
      const detailRes = await fetch(`${API}/contents/${c.id}`);
      const detail = await detailRes.json();
      const file = detail.data || detail;
      if (file.baseArticle && file.baseArticle.html && file.baseArticle.html.length > 100) {
        skip++;
        continue;
      }

      // 노트 fetch
      const noteRes = await fetch(`${API}/notes/${c.sourceId}`);
      if (!noteRes.ok) {
        console.log(`  ✗ note ${c.sourceId} not found`);
        continue;
      }
      const noteJson = await noteRes.json();
      const note = noteJson.data || noteJson;

      const baseArticle = {
        html: note.content || '',
        keywords: note.relatedKeywords || [],
        summary: `${note.eraLabel || note.era}: ${note.title}`,
      };

      // 저장
      const saveRes = await fetch(`${API}/contents/${c.id}/base-article`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(baseArticle),
      });
      if (saveRes.ok) {
        done++;
        if ((i + 1) % 10 === 0) console.log(`  진행: ${i + 1}/${targets.length}`);
      } else {
        const err = await saveRes.text();
        console.log(`  ✗ ${c.id} — ${err.slice(0, 100)}`);
      }
    } catch (e) {
      console.log(`  ✗ ${c.id} — ${e.message}`);
    }
  }

  console.log('\n=== 완료 ===');
  console.log(`baseArticle 채움: ${done}/${targets.length}`);
  if (skip > 0) console.log(`skip (이미 있음): ${skip}`);
}

main().catch((e) => {
  console.error('FAIL:', e);
  process.exit(1);
});
