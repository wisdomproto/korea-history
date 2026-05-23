/**
 * 78회 한국사능력검정시험 심화 import script.
 *
 * Pipeline:
 *   1. POST /api/exams         → create exam 78 (returns id)
 *   2. POST /api/pdf/parse     → Gemini Vision parses 문제지 PDF → 50 questions
 *   3. POST /api/questions/batch → save questions
 *   4. PUT  /api/questions/bulk-answers → overwrite correctAnswer + points with 답지
 *
 * Usage: node scripts/import-exam-78.mjs
 */

import fs from 'fs';
import path from 'path';

const API = 'http://localhost:3001/api';
const PDF = path.resolve(
  'C:/Users/kil21/Downloads',
  '78회 한국사_문제지(심화).pdf',
);

// 78회 공식 답지 — 50문제 (number, correctAnswer 1~5, points 1~3)
const ANSWER_KEY = [
  { n: 1, a: 5, p: 1 }, { n: 2, a: 2, p: 3 }, { n: 3, a: 1, p: 2 }, { n: 4, a: 5, p: 3 }, { n: 5, a: 2, p: 2 },
  { n: 6, a: 4, p: 2 }, { n: 7, a: 4, p: 1 }, { n: 8, a: 3, p: 2 }, { n: 9, a: 3, p: 2 }, { n: 10, a: 4, p: 2 },
  { n: 11, a: 4, p: 2 }, { n: 12, a: 3, p: 1 }, { n: 13, a: 5, p: 1 }, { n: 14, a: 3, p: 2 }, { n: 15, a: 4, p: 2 },
  { n: 16, a: 3, p: 2 }, { n: 17, a: 5, p: 2 }, { n: 18, a: 4, p: 2 }, { n: 19, a: 1, p: 3 }, { n: 20, a: 5, p: 3 },
  { n: 21, a: 1, p: 3 }, { n: 22, a: 4, p: 2 }, { n: 23, a: 1, p: 3 }, { n: 24, a: 5, p: 1 }, { n: 25, a: 1, p: 2 },
  { n: 26, a: 5, p: 1 }, { n: 27, a: 2, p: 2 }, { n: 28, a: 2, p: 2 }, { n: 29, a: 1, p: 2 }, { n: 30, a: 2, p: 3 },
  { n: 31, a: 4, p: 2 }, { n: 32, a: 3, p: 2 }, { n: 33, a: 2, p: 2 }, { n: 34, a: 4, p: 1 }, { n: 35, a: 3, p: 3 },
  { n: 36, a: 1, p: 1 }, { n: 37, a: 3, p: 3 }, { n: 38, a: 4, p: 2 }, { n: 39, a: 2, p: 2 }, { n: 40, a: 4, p: 2 },
  { n: 41, a: 2, p: 2 }, { n: 42, a: 1, p: 2 }, { n: 43, a: 1, p: 2 }, { n: 44, a: 5, p: 2 }, { n: 45, a: 5, p: 1 },
  { n: 46, a: 2, p: 2 }, { n: 47, a: 2, p: 1 }, { n: 48, a: 5, p: 3 }, { n: 49, a: 2, p: 2 }, { n: 50, a: 5, p: 2 },
];

async function getOrCreateExam() {
  const list = await fetch(`${API}/exams`).then((r) => r.json());
  const existing = list.data.find((e) => e.examNumber === 78);
  if (existing) {
    console.log(`      → exam 78 already exists (id=${existing.id}, questionCount=${existing.questionCount})`);
    return existing;
  }
  const body = {
    examNumber: 78,
    examDate: '2026-05-23',
    examType: 'advanced',
    totalQuestions: 50,
    timeLimitMinutes: 80,
    isFree: true,
  };
  const res = await fetch(`${API}/exams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`createExam failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.data.exam;
}

async function parsePdf() {
  const form = new FormData();
  const buf = fs.readFileSync(PDF);
  form.append('pdf', new Blob([buf], { type: 'application/pdf' }), path.basename(PDF));
  form.append('examNumber', '78');

  console.log(`[parse] uploading ${PDF} (${(buf.length / 1024).toFixed(1)} KB)…`);
  const res = await fetch(`${API}/pdf/parse`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`parsePdf failed: ${res.status} ${await res.text()}`);

  // SSE stream
  const text = await res.text();
  let questions = [];
  for (const line of text.split('\n')) {
    if (!line.startsWith('data: ')) continue;
    const data = line.slice(6).trim();
    if (!data) continue;
    try {
      const p = JSON.parse(data);
      if (p.type === 'progress') console.log(`        ${p.message}`);
      else if (p.type === 'done') questions = p.data;
      else if (p.type === 'error') throw new Error(p.error);
    } catch (e) {
      if (e.message?.includes('Failed') || e.message?.includes('failed')) throw e;
    }
  }
  return questions;
}

async function addBatch(examId, questions) {
  const res = await fetch(`${API}/questions/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ examId, questions }),
  });
  if (!res.ok) throw new Error(`addBatch failed: ${res.status} ${await res.text()}`);
  return (await res.json()).data;
}

async function applyAnswers(examId) {
  const answers = ANSWER_KEY.map(({ n, a, p }) => ({ questionNumber: n, correctAnswer: a, points: p }));
  const res = await fetch(`${API}/questions/bulk-answers`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ examId, answers }),
  });
  if (!res.ok) throw new Error(`applyAnswers failed: ${res.status} ${await res.text()}`);
  return (await res.json()).data;
}

(async () => {
  console.log('[1/4] getting / creating exam 78…');
  const exam = await getOrCreateExam();
  console.log('      → id:', exam.id);

  // Probe current questions
  const cur = await fetch(`${API}/questions?examId=${exam.id}`).then((r) => r.json());
  const curCount = cur.data?.length ?? 0;
  console.log(`      → existing questions: ${curCount}`);

  let added;
  if (curCount >= 50) {
    console.log('[2-3/4] questions already imported — skipping parse + batch');
  } else {
    console.log('[2/4] parsing PDF via Gemini Vision…');
    const questions = await parsePdf();
    console.log(`      → parsed ${questions.length} questions`);
    fs.writeFileSync('scripts/.exam-78-raw.json', JSON.stringify(questions, null, 2));

    if (questions.length === 0) {
      console.error('No questions parsed — bailing out');
      process.exit(1);
    }

    console.log('[3/4] adding questions to exam…');
    added = await addBatch(exam.id, questions);
    console.log(`      → saved ${added.length} questions`);
  }

  console.log('[4/4] applying official answer key (correctAnswer + points)…');
  await applyAnswers(exam.id);
  const final = await fetch(`${API}/questions?examId=${exam.id}`).then((r) => r.json()).then((j) => j.data);
  console.log(`      → final question count: ${final.length}`);

  // Sanity check
  const wrongAnswers = final.filter((q) => {
    const ak = ANSWER_KEY.find((a) => a.n === q.questionNumber);
    return ak && (q.correctAnswer !== ak.a || q.points !== ak.p);
  });
  if (wrongAnswers.length > 0) {
    console.warn(`[WARN] ${wrongAnswers.length} questions still have wrong answer/points:`);
    for (const q of wrongAnswers.slice(0, 5)) {
      console.warn(`   Q${q.questionNumber}: got a=${q.correctAnswer} p=${q.points}`);
    }
  } else {
    console.log('✅ all 50 answers + points match official key');
  }
})().catch((e) => {
  console.error('IMPORT FAILED:', e);
  process.exit(1);
});
