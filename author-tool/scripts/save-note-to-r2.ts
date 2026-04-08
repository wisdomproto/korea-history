import fs from 'fs/promises';
import { putObject, getObjectText } from '../server/services/r2.service.js';

const category = process.argv[2] || '정보처리산업기사';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlFile = process.argv[3] || path.resolve(__dirname, `../../cbt_data/summary_notes/${category}_full.html`);

async function main() {
  const html = await fs.readFile(htmlFile, 'utf-8');
  const noteId = `sn-${category}-full`;

  const note = {
    id: noteId,
    categoryCode: category,
    title: `${category} 핵심 요약노트`,
    examIds: [],
    questionCount: 500,
    topicCount: 260,
    html,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Save note
  const noteKey = `cbt/${category}/summary-notes/${noteId}.json`;
  await putObject(noteKey, JSON.stringify(note, null, 2));
  console.log(`📝 Note saved: ${noteKey}`);

  // Update index
  const indexKey = `cbt/${category}/summary-notes/_index.json`;
  let index: any[] = [];
  try { index = JSON.parse(await getObjectText(indexKey)); } catch {}
  const meta = { id: noteId, title: note.title, questionCount: 500, topicCount: 260, createdAt: note.createdAt };
  const existing = index.findIndex((n: any) => n.id === noteId);
  if (existing >= 0) index[existing] = meta;
  else index.unshift(meta);
  await putObject(indexKey, JSON.stringify(index, null, 2));
  console.log(`📋 Index updated: ${index.length} notes`);

  console.log(`\n✅ 완료! ${html.length.toLocaleString()} chars`);
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });
