/**
 * Q14, Q26 choices_image (5선지 합쳐진 이미지)도 R2에 별도 업로드 + URL 로깅.
 * 저작도구에서 사용자가 보고 선지별로 자르거나 교체할 때 참고.
 */
import fs from 'fs';

const API = 'http://localhost:3001/api';
const DIR = 'C:/project/korea-history/data/images/exam-78';

async function uploadImage(filepath) {
  const buf = fs.readFileSync(filepath);
  const form = new FormData();
  form.append('image', new Blob([buf], { type: 'image/png' }), filepath.split('/').pop());
  const res = await fetch(`${API}/images/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`upload failed: ${res.status} ${await res.text()}`);
  return (await res.json()).data.url;
}

(async () => {
  const targets = [
    { q: 14, file: `${DIR}/exam-78_q14_choices_image.png`, note: 'screenshot은 imageUrl로 이미 적용됨, 이건 선지 5개 합쳐진 이미지' },
    { q: 26, file: `${DIR}/exam-78_q26_choices_image.png`, note: '현재 imageUrl로 적용된 그것 (선지 5개 합쳐진 이미지) — 분리 필요' },
  ];

  console.log('Q14, Q26 선지 이미지 백업 업로드…\n');
  for (const t of targets) {
    if (!fs.existsSync(t.file)) {
      console.log(`Q${t.q}: 파일 없음 ${t.file}`);
      continue;
    }
    const url = await uploadImage(t.file);
    console.log(`Q${t.q} choices_image → ${url}`);
    console.log(`        ${t.note}\n`);
  }
})().catch((e) => { console.error(e); process.exit(1); });
