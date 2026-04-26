#!/usr/bin/env node
/**
 * 17개 한능검 카드뉴스의 cover 슬라이드 이미지 일괄 생성.
 * - data/cardnews-drafts/{noteId}.json 의 cover.imagePrompt 사용
 * - POST /api/contents/{contentId}/channels/instagram/image
 * - 슬라이드의 imageUrl 업데이트 자동
 *
 * Usage: node scripts/gen-cardnews-cover-images.mjs [--outro]
 *   --outro: cover 외에 outro 슬라이드도 같이 생성
 */
import fs from 'node:fs';
import path from 'node:path';

const API = 'http://localhost:3001/api';
const PROJECT_ID = 'proj-default';
const DRAFTS_DIR = 'data/cardnews-drafts';
const INCLUDE_OUTRO = process.argv.includes('--outro');

// Gemini 모델 — gemini-2.5-flash-image (default) or gemini-3-flash-image (최신)
const MODEL = 'gemini-2.5-flash-image';
const ASPECT = '4:5';

async function main() {
  // 노트→content 매핑
  const all = await (await fetch(`${API}/contents`)).json();
  const list = Array.isArray(all) ? all : all.data || [];
  const noteToContentId = new Map(
    list.filter((c) => c.projectId === PROJECT_ID && c.sourceType === 'note').map((c) => [c.sourceId, c.id])
  );

  const files = fs.readdirSync(DRAFTS_DIR).filter((f) => /^s\d/.test(f) && f.endsWith('.json'));
  console.log(`총 노트: ${files.length}, outro 포함: ${INCLUDE_OUTRO}`);

  const tasks = [];
  for (const file of files) {
    const noteId = file.replace('.json', '');
    const contentId = noteToContentId.get(noteId);
    if (!contentId) { console.log(`  ✗ ${noteId} — content 매핑 없음`); continue; }
    const draft = JSON.parse(fs.readFileSync(path.join(DRAFTS_DIR, file), 'utf8'));
    const d = draft.data;
    if (!d) continue;

    if (d.cover?.imagePrompt) {
      tasks.push({ noteId, contentId, slideId: 'sl-01-cover', prompt: d.cover.imagePrompt });
    }
    if (INCLUDE_OUTRO && d.outro?.imagePrompt) {
      tasks.push({ noteId, contentId, slideId: 'sl-06-outro', prompt: d.outro.imagePrompt });
    }
  }
  console.log(`이미지 생성 작업: ${tasks.length}건\n`);

  let done = 0, failed = 0;
  for (const t of tasks) {
    const start = Date.now();
    process.stdout.write(`  [${done + failed + 1}/${tasks.length}] ${t.noteId} ${t.slideId} ... `);
    try {
      const res = await fetch(
        `${API}/contents/${t.contentId}/channels/instagram/image`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetId: t.slideId,
            imagePrompt: t.prompt,
            modelId: MODEL,
            aspectRatio: ASPECT,
          }),
        }
      );
      if (res.ok) {
        const j = await res.json();
        const ms = Date.now() - start;
        console.log(`✓ ${ms}ms`);
        done++;
      } else {
        const err = await res.text();
        console.log(`✗ ${err.slice(0, 80)}`);
        failed++;
      }
    } catch (e) {
      console.log(`✗ ${e.message}`);
      failed++;
    }
  }

  console.log(`\n=== 완료 ===`);
  console.log(`성공: ${done}/${tasks.length}, 실패: ${failed}`);
}

main().catch((e) => { console.error('FAIL:', e); process.exit(1); });
