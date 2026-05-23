/**
 * Q9, Q14, Q26 선지 이미지 + passage를 Gemini 2.5 Pro Vision으로 정확히 재식별.
 * 결과를 JSON으로 저장 → 사람이 확인 → 해설 재작성.
 *
 * 핵심: 초기 Gemini 2.5 Flash가 텍스트 추출 단계에서 선지 라벨을 "추정"으로 적었는데
 * 실제 이미지와 매칭 검증이 없었음. Q26은 (가)를 이하응이라 했지만 실제 passage는 김정희.
 */
import fs from 'fs';
import path from 'path';

const ENV = 'C:/project/korea-history/author-tool/.env';
const KEY = fs
  .readFileSync(ENV, 'utf-8')
  .split('\n')
  .find((l) => l.startsWith('GEMINI_API_KEY='))
  .split('=')[1]
  .trim();
const MODEL = 'gemini-2.5-pro';
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;

const IMG_DIR = 'C:/project/korea-history/data/images/exam-78';

const TARGETS = [
  {
    q: 9,
    era: '남북국',
    correctAnswer: 3,
    passageFile: `${IMG_DIR}/exam-78_q09_passage.png`,
    choicesFile: `${IMG_DIR}/exam-78_q09_choices_image.png`,
  },
  {
    q: 14,
    era: '고려',
    correctAnswer: 3,
    passageFile: `${IMG_DIR}/exam-78_q14_screenshot.png`,
    choicesFile: `${IMG_DIR}/exam-78_q14_choices_image.png`,
  },
  {
    q: 26,
    era: '조선 후기',
    correctAnswer: 5,
    passageFile: null,
    choicesFile: `${IMG_DIR}/exam-78_q26_choices_image.png`,
  },
];

function toB64(filepath) {
  return fs.readFileSync(filepath).toString('base64');
}

async function callVision(prompt, imageFiles) {
  const parts = [{ text: prompt }];
  for (const f of imageFiles) {
    parts.push({ inline_data: { mime_type: 'image/png', data: toB64(f) } });
  }
  const payload = {
    contents: [{ parts }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
  };
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status} ${await res.text()}`);
  const j = await res.json();
  const ps = j.candidates?.[0]?.content?.parts || [];
  for (let i = ps.length - 1; i >= 0; i--) if (ps[i].text) return ps[i].text;
  return '';
}

const PROMPT = (q, era, correct) => `당신은 한국사 미술·고고학 전문가입니다.
한국사능력검정시험 78회 ${q}번 문제의 자료를 정확히 식별해주세요.

[배경]
- 문제 시대: ${era}
- 공식 정답: ${correct}번
- 첫번째 이미지: 문제의 본문/사료 (있다면). passage 영역 — (가) 또는 (나) 등이 누구/무엇을 가리키는지 결정적 단서가 들어있음
- 두번째 이미지: 5개 선지(①②③④⑤)가 나열된 그림. 각 그림은 시대별 문화유산 또는 작품.

[작업]
1. passage 이미지를 보고 (가)가 무엇/누구를 가리키는지 결정 (사료 단서 명시)
2. 선지 이미지의 ①②③④⑤ 각각의 정확한 명칭·시대·간단 설명을 식별
3. 공식 정답 ${correct}번이 (가)와 연결되는지 검증

JSON으로만 응답:
\`\`\`json
{
  "passage_subject": "(가)가 가리키는 인물/국가/시대 — 단서와 함께",
  "passage_evidence": ["사료에서 결정적 단서 1", "단서 2"],
  "choices": [
    { "number": 1, "name": "정확한 작품/유물 이름", "era": "시대 (예: 발해, 통일신라, 고려, 조선 등)", "note": "특징/제작자/위치 등 한 줄" },
    { "number": 2, ... },
    { "number": 3, ... },
    { "number": 4, ... },
    { "number": 5, ... }
  ],
  "correct_choice_explanation": "${correct}번이 (가)와 매칭되는 이유 한 줄",
  "confidence": "high|medium|low",
  "concerns": ["식별이 불확실한 부분 있으면 적어주세요"]
}
\`\`\``;

(async () => {
  const results = {};
  for (const t of TARGETS) {
    console.log(`\n=== Q${t.q} (${t.era}, 정답 ${t.correctAnswer}번) ===`);
    const images = [];
    if (t.passageFile && fs.existsSync(t.passageFile)) images.push(t.passageFile);
    images.push(t.choicesFile);

    const prompt = PROMPT(t.q, t.era, t.correctAnswer);
    const raw = await callVision(prompt, images);
    console.log('--- raw response ---');
    console.log(raw.slice(0, 2500));
    console.log('---');

    // Parse JSON
    let text = raw.trim();
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence) text = fence[1].trim();
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      console.log('JSON parse failed:', e.message);
    }
    results[`Q${t.q}`] = { ...t, parsed, raw: parsed ? undefined : raw };
  }

  fs.mkdirSync('C:/project/korea-history/scripts/output', { recursive: true });
  fs.writeFileSync(
    'C:/project/korea-history/scripts/output/exam-78-image-reid.json',
    JSON.stringify(results, null, 2),
  );
  console.log('\n✅ Results: scripts/output/exam-78-image-reid.json');
})().catch((e) => { console.error(e); process.exit(1); });
