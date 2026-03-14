/**
 * Standalone batch explanation generator — NO server dependency.
 * Reads exam files directly, calls Gemini API, writes back to files.
 *
 * Usage: npx tsx scripts/batch-explanations-standalone.ts [--delay MS] [--dry-run]
 */

import fs from 'fs';
import path from 'path';

// Load env from author-tool/.env manually
const envPath = path.join(__dirname, '..', 'author-tool', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envMatch = envContent.match(/^GEMINI_API_KEY=(.+)$/m);
const GEMINI_API_KEY = envMatch?.[1]?.trim();
if (!GEMINI_API_KEY) { console.error('GEMINI_API_KEY not found in', envPath); process.exit(1); }

const DATA_DIR = path.join(__dirname, '..', 'data', 'questions');
const MODEL = 'gemini-2.5-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;
const DEFAULT_DELAY = 400;

interface Question {
  id: number;
  questionNumber: number;
  content: string;
  choices: [string, string, string, string, string];
  correctAnswer: number;
  era: string;
  category: string;
  explanation?: string;
  [key: string]: any;
}

interface ExamFile {
  exam: { id: number; examNumber: number; [key: string]: any };
  questions: Question[];
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function generateExplanation(q: Question): Promise<string> {
  const choiceText = q.choices.map((c, i) => `${i + 1}. ${c}`).join('\n');
  const prompt = `한국사능력검정시험 문제의 해설을 작성해주세요.

문제: ${q.content}

선지:
${choiceText}

정답: ${q.correctAnswer}번
시대: ${q.era}
분야: ${q.category}

정답인 이유와 오답인 선지들에 대한 간단한 설명을 포함해서 2-4문장으로 해설을 작성해주세요.`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
  };

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json() as any;
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

async function main() {
  const args = process.argv.slice(2);
  const delay = args.includes('--delay') ? parseInt(args[args.indexOf('--delay') + 1]) : DEFAULT_DELAY;
  const dryRun = args.includes('--dry-run');

  console.log(`=== Standalone Explanation Generator ===`);
  console.log(`Model: ${MODEL} | Delay: ${delay}ms | Dry run: ${dryRun}`);

  // Read all exam files
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => /^exam-\d+\.json$/.test(f))
    .sort((a, b) => {
      const na = parseInt(a.match(/\d+/)![0]);
      const nb = parseInt(b.match(/\d+/)![0]);
      return na - nb;
    });

  let totalGenerated = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const data: ExamFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const { exam, questions } = data;

    const needExpl = questions.filter(q => !q.explanation && q.content.trim());
    if (needExpl.length === 0) {
      console.log(`[${exam.examNumber}회] All ${questions.length} done, skipping`);
      totalSkipped += questions.length;
      continue;
    }

    console.log(`\n[${exam.examNumber}회] ${needExpl.length}/${questions.length} need explanations`);
    let modified = false;

    for (const q of needExpl) {
      const label = `  Q${q.questionNumber}`;

      if (dryRun) {
        console.log(`${label} — dry run`);
        totalSkipped++;
        continue;
      }

      try {
        const explanation = await generateExplanation(q);
        if (explanation) {
          q.explanation = explanation;
          modified = true;
          totalGenerated++;
          console.log(`${label} ✓ (${explanation.slice(0, 60)}...)`);
        } else {
          totalFailed++;
          console.log(`${label} ✗ empty response`);
        }
        await sleep(delay);
      } catch (err: any) {
        totalFailed++;
        console.error(`${label} ✗ ${err.message.slice(0, 100)}`);

        if (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED')) {
          console.log('  Rate limited, waiting 60s...');
          await sleep(60000);
        } else if (err.message.includes('500')) {
          console.log('  Server error, waiting 5s...');
          await sleep(5000);
        }
      }
    }

    // Save after each exam
    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`  → Saved ${file}`);
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Generated: ${totalGenerated} | Skipped: ${totalSkipped} | Failed: ${totalFailed}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
