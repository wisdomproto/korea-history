/**
 * Batch generate AI explanations for all questions without explanations.
 * Uses the author-tool server API (must be running on port 3001).
 *
 * Usage: npx tsx scripts/batch-generate-explanations.ts [--exam N] [--delay MS] [--dry-run]
 */

const API_BASE = 'http://localhost:3001/api';
const DEFAULT_DELAY = 500; // ms between requests

interface Question {
  id: number;
  questionNumber: number;
  content: string;
  choices: [string, string, string, string, string];
  correctAnswer: number;
  era: string;
  category: string;
  explanation?: string;
}

interface ExamData {
  exam: { id: number; examNumber: number };
  questions: Question[];
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  const json = await res.json() as any;
  return json.data ?? json;
}

async function postJson<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${url} → ${res.status}: ${text}`);
  }
  const json = await res.json() as any;
  return json.data ?? json;
}

async function updateQuestion(questionId: number, explanation: string): Promise<void> {
  const res = await fetch(`${API_BASE}/questions/${questionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ explanation }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PUT question ${questionId} → ${res.status}: ${text}`);
  }
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const args = process.argv.slice(2);
  const examOnly = args.includes('--exam') ? parseInt(args[args.indexOf('--exam') + 1]) : null;
  const delay = args.includes('--delay') ? parseInt(args[args.indexOf('--delay') + 1]) : DEFAULT_DELAY;
  const dryRun = args.includes('--dry-run');

  console.log(`=== Batch Explanation Generator ===`);
  console.log(`Delay: ${delay}ms | Exam filter: ${examOnly ?? 'all'} | Dry run: ${dryRun}`);

  // Fetch all exams
  const exams = await fetchJson<{ id: number; examNumber: number }[]>(`${API_BASE}/exams`);
  const sortedExams = exams.sort((a, b) => a.examNumber - b.examNumber);

  let totalGenerated = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const examMeta of sortedExams) {
    if (examOnly && examMeta.examNumber !== examOnly) continue;

    const examData = await fetchJson<ExamData>(`${API_BASE}/exams/${examMeta.id}`);
    const needExpl = examData.questions.filter(q => !q.explanation && q.content.trim());

    if (needExpl.length === 0) {
      console.log(`[${examData.exam.examNumber}회] All ${examData.questions.length} questions have explanations, skipping`);
      totalSkipped += examData.questions.length;
      continue;
    }

    console.log(`\n[${examData.exam.examNumber}회] ${needExpl.length}/${examData.questions.length} questions need explanations`);

    for (const q of needExpl) {
      const label = `  Q${q.questionNumber}`;

      if (!q.content.trim()) {
        console.log(`${label} — empty content, skipping`);
        totalSkipped++;
        continue;
      }

      if (dryRun) {
        console.log(`${label} — would generate (dry run)`);
        totalSkipped++;
        continue;
      }

      try {
        const explanation = await postJson<string>(`${API_BASE}/generate/explanation`, {
          content: q.content,
          choices: q.choices,
          correctAnswer: q.correctAnswer,
          era: q.era,
          category: q.category,
        });

        await updateQuestion(q.id, explanation);
        totalGenerated++;
        console.log(`${label} ✓ (${explanation.slice(0, 50)}...)`);

        await sleep(delay);
      } catch (err: any) {
        totalFailed++;
        console.error(`${label} ✗ ${err.message}`);

        // If rate limited, wait longer
        if (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED')) {
          console.log('  Rate limited, waiting 30s...');
          await sleep(30000);
        }
      }
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Generated: ${totalGenerated} | Skipped: ${totalSkipped} | Failed: ${totalFailed}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
