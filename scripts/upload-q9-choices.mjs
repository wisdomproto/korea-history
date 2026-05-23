/**
 * Q9 (78회) 선지 합본 이미지 + passage 영역 별도 R2 업로드.
 * Q9는 통일신라 문화재 5개 사진을 선지로 갖는 image-choice 문제인데
 * 초기 분류기에서 일반 illustration으로 잘못 잡혀서 누락됨.
 */
import fs from 'fs';
const API = 'http://localhost:3001/api';

async function up(filepath) {
  const buf = fs.readFileSync(filepath);
  const form = new FormData();
  form.append('image', new Blob([buf], { type: 'image/png' }), filepath.split('/').pop());
  const r = await fetch(`${API}/images/upload`, { method: 'POST', body: form });
  if (!r.ok) throw new Error(await r.text());
  return (await r.json()).data.url;
}

(async () => {
  const choices = await up('C:/project/korea-history/data/images/exam-78/exam-78_q09_choices_image.png');
  console.log('Q9 choices_image →', choices);
  const passage = await up('C:/project/korea-history/data/images/exam-78/exam-78_q09_passage.png');
  console.log('Q9 passage only →', passage);
})().catch((e) => { console.error(e); process.exit(1); });
