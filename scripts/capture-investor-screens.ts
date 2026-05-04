import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

/**
 * 투자자 데크용 데스크톱 스크린샷 (1600x900).
 * 일부 페이지(내 기록·오답노트)는 localStorage에 fake 데이터를 주입해
 * "사용된 상태"를 흉내냄.
 *
 * 출력 → docs/img/investor/*.png
 */

// ===== Fake localStorage seed =====
const fakeExamHistory = [
  { examNumber: 77, score: 47, total: 50, percentage: 94, grade: '1급', wrongByEra: { '조선 후기': 1, '근대': 1, '현대': 1 }, date: '2026-04-29T13:24:00.000Z' },
  { examNumber: 76, score: 44, total: 50, percentage: 88, grade: '1급', wrongByEra: { '고려': 2, '조선 전기': 1, '근대': 3 }, date: '2026-04-25T20:11:00.000Z' },
  { examNumber: 75, score: 41, total: 50, percentage: 82, grade: '1급', wrongByEra: { '삼국': 1, '남북국': 2, '조선 후기': 3, '근대': 3 }, date: '2026-04-22T09:48:00.000Z' },
  { examNumber: 74, score: 38, total: 50, percentage: 76, grade: '2급', wrongByEra: { '고려': 3, '조선 후기': 4, '근대': 3, '현대': 2 }, date: '2026-04-18T22:05:00.000Z' },
  { examNumber: 73, score: 42, total: 50, percentage: 84, grade: '1급', wrongByEra: { '조선 전기': 2, '근대': 4, '현대': 2 }, date: '2026-04-14T14:30:00.000Z' },
  { examNumber: 72, score: 36, total: 50, percentage: 72, grade: '2급', wrongByEra: { '선사·고조선': 1, '고려': 3, '조선 후기': 4, '근대': 3, '현대': 3 }, date: '2026-04-10T19:55:00.000Z' },
  { examNumber: 71, score: 40, total: 50, percentage: 80, grade: '1급', wrongByEra: { '삼국': 2, '조선 후기': 3, '근대': 3, '현대': 2 }, date: '2026-04-05T11:10:00.000Z' },
];

const fakeWrongAnswers = [
  { questionId: 7712, examId: 77, examNumber: 77, questionNumber: 12, selectedAnswer: 2, correctAnswer: 4, questionContent: '광해군이 시행한 외교 정책으로 옳은 것을 고르시오.', era: '조선 후기', category: '정치', points: 2, createdAt: '2026-04-29T13:18:00.000Z', resolved: false },
  { questionId: 7728, examId: 77, examNumber: 77, questionNumber: 28, selectedAnswer: 1, correctAnswer: 3, questionContent: '갑오개혁의 주요 내용으로 가장 적절한 것은?', era: '근대', category: '정치', points: 3, createdAt: '2026-04-29T13:21:00.000Z', resolved: false },
  { questionId: 7741, examId: 77, examNumber: 77, questionNumber: 41, selectedAnswer: 4, correctAnswer: 2, questionContent: '6월 민주항쟁의 결과로 옳은 것은?', era: '현대', category: '정치', points: 3, createdAt: '2026-04-29T13:23:00.000Z', resolved: false },
  { questionId: 7615, examId: 76, examNumber: 76, questionNumber: 15, selectedAnswer: 2, correctAnswer: 1, questionContent: '고려 광종의 정책으로 옳은 것은?', era: '고려', category: '정치', points: 2, createdAt: '2026-04-25T20:03:00.000Z', resolved: true, resolvedAt: '2026-04-26T09:15:00.000Z' },
  { questionId: 7619, examId: 76, examNumber: 76, questionNumber: 19, selectedAnswer: 3, correctAnswer: 4, questionContent: '고려시대 토지제도에 대한 설명으로 옳은 것은?', era: '고려', category: '경제', points: 2, createdAt: '2026-04-25T20:06:00.000Z', resolved: false },
  { questionId: 7625, examId: 76, examNumber: 76, questionNumber: 25, selectedAnswer: 1, correctAnswer: 3, questionContent: '훈민정음 창제의 배경으로 적절하지 않은 것은?', era: '조선 전기', category: '문화', points: 3, createdAt: '2026-04-25T20:09:00.000Z', resolved: false },
  { questionId: 7634, examId: 76, examNumber: 76, questionNumber: 34, selectedAnswer: 4, correctAnswer: 2, questionContent: '대한제국의 광무개혁에 대한 설명으로 옳은 것은?', era: '근대', category: '정치', points: 3, createdAt: '2026-04-25T20:12:00.000Z', resolved: false },
  { questionId: 7508, examId: 75, examNumber: 75, questionNumber: 8, selectedAnswer: 2, correctAnswer: 1, questionContent: '신라의 골품제에 대한 설명으로 옳은 것은?', era: '삼국', category: '사회', points: 2, createdAt: '2026-04-22T09:32:00.000Z', resolved: true, resolvedAt: '2026-04-23T08:00:00.000Z' },
  { questionId: 7514, examId: 75, examNumber: 75, questionNumber: 14, selectedAnswer: 3, correctAnswer: 4, questionContent: '발해의 대외관계로 옳은 것은?', era: '남북국', category: '정치', points: 2, createdAt: '2026-04-22T09:36:00.000Z', resolved: false },
  { questionId: 7522, examId: 75, examNumber: 75, questionNumber: 22, selectedAnswer: 1, correctAnswer: 3, questionContent: '조선 후기 실학자에 대한 설명으로 옳은 것은?', era: '조선 후기', category: '문화', points: 3, createdAt: '2026-04-22T09:40:00.000Z', resolved: false },
  { questionId: 7538, examId: 75, examNumber: 75, questionNumber: 38, selectedAnswer: 4, correctAnswer: 2, questionContent: '동학농민운동의 배경으로 옳은 것은?', era: '근대', category: '사회', points: 3, createdAt: '2026-04-22T09:44:00.000Z', resolved: false },
  { questionId: 7546, examId: 75, examNumber: 75, questionNumber: 46, selectedAnswer: 2, correctAnswer: 1, questionContent: '4·19 혁명에 대한 설명으로 옳은 것은?', era: '현대', category: '정치', points: 2, createdAt: '2026-04-22T09:46:00.000Z', resolved: false },
  { questionId: 7411, examId: 74, examNumber: 74, questionNumber: 11, selectedAnswer: 1, correctAnswer: 4, questionContent: '고려 무신정권 시기의 정치적 상황으로 옳은 것은?', era: '고려', category: '정치', points: 2, createdAt: '2026-04-18T22:00:00.000Z', resolved: false },
  { questionId: 7423, examId: 74, examNumber: 74, questionNumber: 23, selectedAnswer: 3, correctAnswer: 2, questionContent: '병자호란의 결과에 대한 설명으로 옳은 것은?', era: '조선 후기', category: '정치', points: 3, createdAt: '2026-04-18T22:02:00.000Z', resolved: false },
  { questionId: 7445, examId: 74, examNumber: 74, questionNumber: 45, selectedAnswer: 4, correctAnswer: 3, questionContent: '5·18 민주화운동의 의의로 옳은 것은?', era: '현대', category: '정치', points: 3, createdAt: '2026-04-18T22:04:00.000Z', resolved: false },
  { questionId: 7332, examId: 73, examNumber: 73, questionNumber: 32, selectedAnswer: 2, correctAnswer: 1, questionContent: '대동법의 시행 결과로 옳은 것은?', era: '조선 후기', category: '경제', points: 3, createdAt: '2026-04-14T14:25:00.000Z', resolved: true, resolvedAt: '2026-04-15T08:00:00.000Z' },
  { questionId: 7339, examId: 73, examNumber: 73, questionNumber: 39, selectedAnswer: 1, correctAnswer: 4, questionContent: '을미사변의 배경에 대한 설명으로 옳은 것은?', era: '근대', category: '정치', points: 3, createdAt: '2026-04-14T14:28:00.000Z', resolved: false },
];

const ENABLE_SEED_KEYS = {
  'exam-history:한능검:한국사': fakeExamHistory,
  'wrong-answers:한능검:한국사': fakeWrongAnswers,
};

// ===== Pages =====
const pages: Array<{ name: string; url: string; waitFor?: number; seed?: boolean }> = [
  { name: 'hero',          url: 'https://gcnote.co.kr',                          waitFor: 1500 },
  { name: 'exam-list',     url: 'https://gcnote.co.kr/exam',                     waitFor: 1500 },
  { name: 'question',      url: 'https://gcnote.co.kr/exam/77/1',                waitFor: 2000 },
  { name: 'note-detail',   url: 'https://gcnote.co.kr/notes/s3-09',              waitFor: 2000 },
  { name: 'study-custom',  url: 'https://gcnote.co.kr/study/custom',             waitFor: 1500 },
  { name: 'blog',          url: 'https://gcnote.co.kr/blog',                     waitFor: 1500 },
  { name: 'my-record',     url: 'https://gcnote.co.kr/my-record',                waitFor: 2000, seed: true },
  { name: 'wrong-answers', url: 'https://gcnote.co.kr/wrong-answers',            waitFor: 2000, seed: true },
];

async function seedLocalStorage(page: import('puppeteer').Page) {
  // Origin must match — load a tiny page first so localStorage is on gcnote.co.kr origin
  await page.goto('https://gcnote.co.kr', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate((seed: Record<string, unknown>) => {
    for (const [k, v] of Object.entries(seed)) {
      localStorage.setItem(k, JSON.stringify(v));
    }
  }, ENABLE_SEED_KEYS as unknown as Record<string, unknown>);
}

async function main() {
  const outDir = path.resolve('docs/img/investor');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1.5 });

  let seeded = false;

  for (const p of pages) {
    if (p.seed && !seeded) {
      console.log('seeding localStorage...');
      await seedLocalStorage(page);
      seeded = true;
    }

    const out = path.join(outDir, `${p.name}.png`);
    console.log(`→ ${p.name}  (${p.url})`);
    try {
      await page.goto(p.url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, p.waitFor ?? 1500));
      await page.screenshot({ path: out, fullPage: false });
      console.log(`   saved ${out}`);
    } catch (err) {
      console.warn(`   ! failed: ${(err as Error).message}`);
    }
  }

  await browser.close();
  console.log('done');
}

main().catch(e => { console.error(e); process.exit(1); });
