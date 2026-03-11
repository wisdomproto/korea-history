/**
 * Batch PDF Import Script
 *
 * Imports all exam PDFs (6~77) via the author-tool API.
 * For each PDF:
 *   1. Create exam via POST /api/exams
 *   2. Parse PDF via POST /api/pdf/parse (SSE)
 *   3. Add questions via POST /api/questions/batch
 *
 * Usage: npx tsx scripts/batch-import-pdfs.ts [startExam] [endExam]
 *   e.g. npx tsx scripts/batch-import-pdfs.ts 6 77
 */

import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:3001/api';
const PDF_DIR = path.resolve(__dirname, '../기출문제/1. 기출문제');

// Exam date lookup (approximate dates by exam number)
// 고급 6~46, 심화 47~77
function getExamDate(examNumber: number): string {
  // Rough mapping based on known exam schedule
  const dates: Record<number, string> = {
    6: '2010-05-29', 8: '2010-10-30', 9: '2011-02-12',
    10: '2011-05-28', 11: '2011-08-13', 12: '2011-10-29',
    13: '2012-02-11', 14: '2012-05-26', 15: '2012-08-11',
    16: '2012-10-27', 17: '2013-02-02', 18: '2013-05-25',
    19: '2013-08-10', 20: '2013-10-26', 21: '2014-01-25',
    22: '2014-05-31', 23: '2014-08-09', 24: '2014-10-25',
    25: '2015-01-31', 26: '2015-05-30', 27: '2015-08-08',
    28: '2015-10-31', 29: '2016-01-30', 30: '2016-05-28',
    31: '2016-08-06', 32: '2016-10-29', 33: '2017-01-21',
    34: '2017-05-27', 35: '2017-08-05', 36: '2017-10-28',
    37: '2018-01-27', 38: '2018-04-28', 39: '2018-07-28',
    40: '2018-10-27', 41: '2019-01-26', 42: '2019-04-27',
    43: '2019-08-10', 44: '2019-10-26', 45: '2020-06-27',
    46: '2020-11-21',
    47: '2021-04-10', 48: '2021-06-05', 49: '2021-08-07',
    50: '2021-10-23', 51: '2022-02-12', 52: '2022-04-09',
    53: '2022-06-04', 54: '2022-08-06', 55: '2022-10-29',
    56: '2023-02-11', 57: '2023-04-08', 58: '2023-06-03',
    59: '2023-08-05', 60: '2023-10-21', 61: '2024-02-10',
    62: '2024-04-13', 63: '2024-06-01', 64: '2024-08-10',
    65: '2024-10-19', 66: '2024-12-14', 67: '2025-02-08',
    68: '2025-04-12', 69: '2025-06-07', 70: '2025-08-09',
    71: '2025-10-25', 72: '2025-12-13', 73: '2026-01-01',
    74: '2026-01-01', 75: '2026-01-01', 76: '2026-01-01',
    77: '2026-01-01',
  };
  return dates[examNumber] || '2024-01-01';
}

function findPdfFile(examNumber: number): string | null {
  // Try 고급 first, then 심화
  const patterns = [
    `한국사능력검정 고급 ${examNumber}회 기출문제.pdf`,
    `한국사능력검정 심화 ${examNumber}회 기출문제.pdf`,
  ];
  for (const p of patterns) {
    const fullPath = path.join(PDF_DIR, p);
    if (fs.existsSync(fullPath)) return fullPath;
  }
  return null;
}

interface ParsedQuestion {
  content: string;
  imageUrl?: string;
  choices: [string, string, string, string, string];
  choiceImages?: (string | null)[];
  correctAnswer: number;
  points: number;
  era: string;
  category: string;
  difficulty: 1 | 2 | 3;
}

async function createExam(examNumber: number): Promise<{ id: number }> {
  const body = {
    examNumber,
    examDate: getExamDate(examNumber),
    examType: 'advanced',
    totalQuestions: 50,
    timeLimitMinutes: 80,
    isFree: true,
  };

  const res = await fetch(`${API_BASE}/exams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create exam ${examNumber}: ${err}`);
  }

  const json = await res.json();
  return json.data.exam;
}

async function parsePdf(
  pdfPath: string,
  examNumber: number,
  onProgress?: (msg: string) => void,
): Promise<ParsedQuestion[]> {
  const formData = new FormData();
  const fileBuffer = fs.readFileSync(pdfPath);
  const blob = new Blob([fileBuffer], { type: 'application/pdf' });
  formData.append('pdf', blob, path.basename(pdfPath));
  formData.append('examNumber', String(examNumber));

  const res = await fetch(`${API_BASE}/pdf/parse`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to parse PDF for exam ${examNumber}: ${err}`);
  }

  // Parse SSE stream
  const text = await res.text();
  const lines = text.split('\n');
  let questions: ParsedQuestion[] = [];

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    const data = line.slice(6).trim();
    if (!data) continue;

    try {
      const parsed = JSON.parse(data);
      if (parsed.type === 'progress') {
        onProgress?.(parsed.message);
      } else if (parsed.type === 'done') {
        questions = parsed.data;
      } else if (parsed.type === 'error') {
        throw new Error(parsed.error);
      }
    } catch (e) {
      // Skip non-JSON lines
      if ((e as Error).message?.includes('Failed')) throw e;
    }
  }

  return questions;
}

async function addQuestions(examId: number, questions: ParsedQuestion[]): Promise<void> {
  const res = await fetch(`${API_BASE}/questions/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ examId, questions }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to add questions: ${err}`);
  }
}

async function checkExamExists(examNumber: number): Promise<boolean> {
  const res = await fetch(`${API_BASE}/exams`);
  if (!res.ok) return false;
  const json = await res.json();
  return json.data?.some((e: any) => e.examNumber === examNumber && e.questionCount > 0) ?? false;
}

async function importExam(examNumber: number): Promise<{ questions: number }> {
  const pdfPath = findPdfFile(examNumber);
  if (!pdfPath) {
    throw new Error(`PDF not found for exam ${examNumber}`);
  }

  // 1. Create exam
  console.log(`  [1/3] Creating exam ${examNumber}...`);
  const exam = await createExam(examNumber);
  console.log(`  [1/3] Created exam (id: ${exam.id})`);

  // 2. Parse PDF
  console.log(`  [2/3] Parsing PDF...`);
  const questions = await parsePdf(pdfPath, examNumber, (msg) => {
    console.log(`        ${msg}`);
  });
  console.log(`  [2/3] Parsed ${questions.length} questions`);

  // 3. Add questions
  if (questions.length > 0) {
    console.log(`  [3/3] Adding questions to exam...`);
    await addQuestions(exam.id, questions);
    console.log(`  [3/3] Done!`);
  } else {
    console.log(`  [3/3] No questions parsed, skipping.`);
  }

  return { questions: questions.length };
}

async function main() {
  const args = process.argv.slice(2);
  const startExam = args[0] ? parseInt(args[0]) : 6;
  const endExam = args[1] ? parseInt(args[1]) : 77;

  // Build list of exam numbers with available PDFs
  const examNumbers: number[] = [];
  for (let i = startExam; i <= endExam; i++) {
    if (findPdfFile(i)) {
      examNumbers.push(i);
    }
  }

  console.log(`\n========================================`);
  console.log(`  Batch PDF Import: ${examNumbers.length} exams (${startExam}~${endExam})`);
  console.log(`========================================\n`);

  let success = 0;
  let failed = 0;
  const errors: { exam: number; error: string }[] = [];

  for (let idx = 0; idx < examNumbers.length; idx++) {
    const examNumber = examNumbers[idx];
    const progress = `[${idx + 1}/${examNumbers.length}]`;

    console.log(`\n${progress} === Exam ${examNumber}회 ===`);

    // Skip already imported exams
    try {
      const exists = await checkExamExists(examNumber);
      if (exists) {
        console.log(`${progress} ⏭️  Exam ${examNumber}회 already imported, skipping`);
        success++;
        continue;
      }
    } catch {}

    try {
      const result = await importExam(examNumber);
      console.log(`${progress} ✅ Exam ${examNumber}회 complete (${result.questions} questions)`);
      success++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${progress} ❌ Exam ${examNumber}회 FAILED: ${msg}`);
      errors.push({ exam: examNumber, error: msg });
      failed++;
    }

    // Small delay between exams to avoid rate limiting
    if (idx < examNumbers.length - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  console.log(`\n========================================`);
  console.log(`  Import Complete!`);
  console.log(`  ✅ Success: ${success}`);
  console.log(`  ❌ Failed: ${failed}`);
  if (errors.length > 0) {
    console.log(`\n  Failed exams:`);
    for (const e of errors) {
      console.log(`    - ${e.exam}회: ${e.error}`);
    }
  }
  console.log(`========================================\n`);
}

main().catch(console.error);
