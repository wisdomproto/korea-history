/**
 * 78회 이미지 51개를 R2에 업로드하고 각 문제의 imageUrl 패치.
 *
 * 로직:
 *   - 문제당 이미지 1개 → imageUrl 설정
 *   - 문제당 이미지 2개 (Q14: screenshot + choices_image) → screenshot을 imageUrl로 (텍스트 선지가 이미 choices를 설명)
 *   - 단독 choices_image (Q26) → imageUrl로 사용 (텍스트 선지가 fallback 라벨)
 *
 * Usage: node scripts/upload-exam-78-images.mjs
 */
import fs from 'fs';
import path from 'path';

const API = 'http://localhost:3001/api';
const DIR = 'C:/project/korea-history/data/images/exam-78';
const MANIFEST = path.join(DIR, 'exam-78_manifest.json');
const EXAM_FILE = 'C:/project/korea-history/data/questions/exam-78.json';

function pickImageForQuestion(images) {
  // Prefer non-choices_image, fallback to choices_image
  const main = images.find((i) => i.type !== 'choices_image');
  return main || images[0];
}

async function uploadImage(filepath) {
  const buf = fs.readFileSync(filepath);
  const form = new FormData();
  form.append('image', new Blob([buf], { type: 'image/png' }), path.basename(filepath));
  const res = await fetch(`${API}/images/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`upload ${filepath} failed: ${res.status} ${await res.text()}`);
  const j = await res.json();
  return j.data.url;
}

async function patchQuestion(id, fields) {
  const res = await fetch(`${API}/questions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  if (!res.ok) throw new Error(`patch q${id} failed: ${res.status} ${await res.text()}`);
  return (await res.json()).data;
}

(async () => {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf-8'));
  const exam = JSON.parse(fs.readFileSync(EXAM_FILE, 'utf-8'));

  // Group images by question
  const byQ = new Map();
  for (const img of manifest.images) {
    if (!byQ.has(img.question)) byQ.set(img.question, []);
    byQ.get(img.question).push(img);
  }

  const totalQs = exam.questions.length;
  let uploaded = 0;
  const urlMap = {}; // qNum → uploaded R2 url

  for (const q of exam.questions) {
    const imgs = byQ.get(q.questionNumber) || [];
    if (imgs.length === 0) {
      console.log(`Q${q.questionNumber}: no image, skipping`);
      continue;
    }

    const target = pickImageForQuestion(imgs);
    const filepath = path.join(DIR, target.file);
    if (!fs.existsSync(filepath)) {
      console.warn(`Q${q.questionNumber}: file missing ${target.file}`);
      continue;
    }

    process.stdout.write(`Q${q.questionNumber} (${target.type})… `);
    const url = await uploadImage(filepath);
    urlMap[q.questionNumber] = url;
    await patchQuestion(q.id, { imageUrl: url });
    uploaded++;
    console.log(`✓ ${url.split('/').pop()}`);
  }

  console.log(`\nUploaded + patched ${uploaded}/${totalQs} questions.`);
  fs.writeFileSync(
    path.join(DIR, 'upload-results.json'),
    JSON.stringify({ uploaded, urlMap }, null, 2),
  );
})().catch((e) => {
  console.error('UPLOAD FAILED:', e);
  process.exit(1);
});
