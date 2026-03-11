/**
 * Extract keywords from all exam questions using Gemini API.
 * Generates data/questions/keywords.json and updates each exam JSON with keywords field.
 *
 * Usage: cd author-tool && npx tsx ../scripts/extract-keywords.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Read .env manually (avoid dotenv import resolution issues)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../author-tool/.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

// Use require with explicit path to author-tool's node_modules
import { createRequire } from 'module';
const require = createRequire(path.resolve(__dirname, '../author-tool/package.json'));
const { GoogleGenerativeAI } = require('@google/generative-ai');

const DATA_DIR = path.resolve(__dirname, '../data/questions');
const KEYWORDS_FILE = path.join(DATA_DIR, 'keywords.json');

interface Question {
  id: number;
  content: string;
  passage?: string;
  choices: string[];
  era: string;
  category: string;
  keywords?: string[];
}

interface ExamFile {
  exam: { id: number; examNumber: number; [k: string]: unknown };
  questions: Question[];
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY not found in author-tool/.env');
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  // Load all exam files (scan directory for exam-*.json)
  const allExamFiles: { filePath: string; data: ExamFile }[] = [];
  const allQuestions: Question[] = [];

  const files = fs.readdirSync(DATA_DIR).filter(
    (f) => f.match(/^exam-\d+\.json$/)
  );

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const data: ExamFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    allExamFiles.push({ filePath, data });
    allQuestions.push(...data.questions);
  }

  console.log(`Loaded ${allQuestions.length} questions from ${allExamFiles.length} exams`);

  // Batch questions for Gemini (process in chunks of 10)
  const BATCH_SIZE = 10;
  const keywordsMap: Record<string, number[]> = {};

  for (let i = 0; i < allQuestions.length; i += BATCH_SIZE) {
    const batch = allQuestions.slice(i, i + BATCH_SIZE);
    const batchInfo = batch.map((q) => ({
      id: q.id,
      content: q.content,
      choices: q.choices.join(' / '),
      era: q.era,
    }));

    const prompt = `다음은 한국사능력검정시험 문제들입니다. 각 문제에서 핵심 키워드를 2~5개 추출해주세요.
키워드는 역사적 인물, 사건, 제도, 문화재, 조약, 단체 등 고유명사 위주로 추출하세요.
일반적인 단어(예: "설명", "옳은 것", "다음")는 제외하세요.

JSON 형식으로 응답해주세요:
{"results": [{"id": 문제ID, "keywords": ["키워드1", "키워드2", ...]}, ...]}

문제 목록:
${JSON.stringify(batchInfo, null, 2)}`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      // Extract JSON from response (may be wrapped in markdown code block)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn(`  Batch ${i}-${i + batch.length}: No JSON in response`);
        continue;
      }

      const parsed = JSON.parse(jsonMatch[0]) as {
        results: { id: number; keywords: string[] }[];
      };

      for (const item of parsed.results) {
        // Find question and set keywords
        const q = allQuestions.find((q) => q.id === item.id);
        if (q) {
          q.keywords = item.keywords;
        }

        // Build keyword → questionId[] map
        for (const kw of item.keywords) {
          if (!keywordsMap[kw]) keywordsMap[kw] = [];
          keywordsMap[kw].push(item.id);
        }
      }

      console.log(`  Batch ${i + 1}-${Math.min(i + BATCH_SIZE, allQuestions.length)}: ${parsed.results.length} questions processed`);
    } catch (err) {
      console.error(`  Batch ${i}-${i + batch.length}: Error`, err);
    }

    // Rate limiting
    if (i + BATCH_SIZE < allQuestions.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // Save keywords.json
  // Sort keywords by question count (descending)
  const sortedKeywords: Record<string, number[]> = {};
  Object.entries(keywordsMap)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([kw, ids]) => {
      sortedKeywords[kw] = ids;
    });

  fs.writeFileSync(KEYWORDS_FILE, JSON.stringify({ keywords: sortedKeywords }, null, 2), 'utf-8');
  console.log(`\nSaved ${Object.keys(sortedKeywords).length} keywords to ${KEYWORDS_FILE}`);

  // Update each exam file with keywords
  for (const { filePath, data } of allExamFiles) {
    for (const q of data.questions) {
      const updated = allQuestions.find((aq) => aq.id === q.id);
      if (updated?.keywords) {
        q.keywords = updated.keywords;
      }
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }
  console.log(`Updated ${allExamFiles.length} exam files with keywords`);
}

main().catch(console.error);
