import { ExamService, type Question } from './exam.service.js';
import { putObject, getObjectText } from './r2.service.js';
import { generateText, parseJSON } from './gemini.provider.js';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config.js';

const KEYWORDS_KEY = 'questions/keywords.json';

export interface KeywordsData {
  keywords: Record<string, number[]>; // keyword → questionId[]
  generatedAt?: string;
}

export interface KeywordStats {
  totalKeywords: number;
  totalMappings: number; // sum of all questionId arrays
  byEra: Record<string, { keywords: string[]; count: number }>;
  byCategory: Record<string, { keywords: string[]; count: number }>;
  topKeywords: { keyword: string; count: number; era: string; category: string }[];
}

type ProgressCallback = (message: string) => void;

async function getKeywordsFromR2(): Promise<KeywordsData | null> {
  try {
    const text = await getObjectText(KEYWORDS_KEY);
    return JSON.parse(text) as KeywordsData;
  } catch {
    return null;
  }
}

async function saveKeywords(data: KeywordsData): Promise<void> {
  await putObject(KEYWORDS_KEY, JSON.stringify(data, null, 2), 'application/json');
  // Also sync to local
  try {
    const localPath = path.join(config.dataDir, 'keywords.json');
    await fs.writeFile(localPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    // Non-critical
  }
}

/** Build stats from keywords data + question metadata */
function buildStats(
  kwData: KeywordsData,
  allQuestions: Question[],
): KeywordStats {
  const qMap = new Map(allQuestions.map((q) => [q.id, q]));

  const byEra: Record<string, Set<string>> = {};
  const byCategory: Record<string, Set<string>> = {};
  const keywordMeta: Map<string, { count: number; eras: Record<string, number>; cats: Record<string, number> }> = new Map();

  for (const [kw, ids] of Object.entries(kwData.keywords)) {
    const meta = { count: ids.length, eras: {} as Record<string, number>, cats: {} as Record<string, number> };
    for (const id of ids) {
      const q = qMap.get(id);
      if (!q) continue;

      // By era
      if (!byEra[q.era]) byEra[q.era] = new Set();
      byEra[q.era].add(kw);
      meta.eras[q.era] = (meta.eras[q.era] || 0) + 1;

      // By category
      if (!byCategory[q.category]) byCategory[q.category] = new Set();
      byCategory[q.category].add(kw);
      meta.cats[q.category] = (meta.cats[q.category] || 0) + 1;
    }
    keywordMeta.set(kw, meta);
  }

  // Top keywords with primary era/category
  const topKeywords = [...keywordMeta.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 50)
    .map(([keyword, meta]) => {
      const era = Object.entries(meta.eras).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
      const category = Object.entries(meta.cats).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
      return { keyword, count: meta.count, era, category };
    });

  const byEraResult: Record<string, { keywords: string[]; count: number }> = {};
  for (const [era, kwSet] of Object.entries(byEra)) {
    const keywords = [...kwSet].sort((a, b) => {
      const countA = kwData.keywords[a]?.length ?? 0;
      const countB = kwData.keywords[b]?.length ?? 0;
      return countB - countA;
    });
    byEraResult[era] = { keywords, count: keywords.length };
  }

  const byCategoryResult: Record<string, { keywords: string[]; count: number }> = {};
  for (const [cat, kwSet] of Object.entries(byCategory)) {
    const keywords = [...kwSet].sort((a, b) => {
      const countA = kwData.keywords[a]?.length ?? 0;
      const countB = kwData.keywords[b]?.length ?? 0;
      return countB - countA;
    });
    byCategoryResult[cat] = { keywords, count: keywords.length };
  }

  return {
    totalKeywords: Object.keys(kwData.keywords).length,
    totalMappings: Object.values(kwData.keywords).reduce((s, ids) => s + ids.length, 0),
    byEra: byEraResult,
    byCategory: byCategoryResult,
    topKeywords,
  };
}

export const KeywordService = {
  /** Get current keywords data (null if not extracted yet) */
  async get(): Promise<KeywordsData | null> {
    return getKeywordsFromR2();
  },

  /** Get keyword stats with era/category breakdown */
  async getStats(): Promise<KeywordStats | null> {
    const kwData = await getKeywordsFromR2();
    if (!kwData) return null;

    // Gather all questions
    const exams = await ExamService.list();
    const allQuestions: Question[] = [];
    for (const exam of exams) {
      const file = await ExamService.getById(exam.id);
      allQuestions.push(...file.questions);
    }

    return buildStats(kwData, allQuestions);
  },

  /** Extract keywords from all questions using Gemini */
  async extract(onProgress?: ProgressCallback): Promise<KeywordsData> {
    onProgress?.('시험 데이터 로딩 중...');

    const exams = await ExamService.list();
    const allQuestions: Question[] = [];
    const examFiles: { id: number; examNumber: number }[] = [];

    for (const exam of exams) {
      const file = await ExamService.getById(exam.id);
      allQuestions.push(...file.questions);
      examFiles.push({ id: exam.id, examNumber: exam.examNumber });
    }

    onProgress?.(`${exams.length}개 시험, ${allQuestions.length}개 문제 로딩 완료`);

    // Batch processing
    const BATCH_SIZE = 20;
    const keywordsMap: Record<string, number[]> = {};
    const questionKeywords: Map<number, string[]> = new Map();
    const totalBatches = Math.ceil(allQuestions.length / BATCH_SIZE);

    for (let i = 0; i < allQuestions.length; i += BATCH_SIZE) {
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const batch = allQuestions.slice(i, i + BATCH_SIZE);

      onProgress?.(`키워드 추출 중... (${batchNum}/${totalBatches})`);

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
        const text = await generateText(prompt);
        const parsed = parseJSON<{ results: { id: number; keywords: string[] }[] }>(
          text, '키워드 추출 JSON 파싱 실패',
        );

        for (const item of parsed.results) {
          questionKeywords.set(item.id, item.keywords);
          for (const kw of item.keywords) {
            if (!keywordsMap[kw]) keywordsMap[kw] = [];
            keywordsMap[kw].push(item.id);
          }
        }
      } catch (err) {
        console.error(`Batch ${batchNum} 키워드 추출 실패:`, err);
        onProgress?.(`배치 ${batchNum} 실패 — 건너뜀`);
      }

      // Rate limiting (500ms between batches)
      if (i + BATCH_SIZE < allQuestions.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    // Sort by frequency descending
    const sorted: Record<string, number[]> = {};
    Object.entries(keywordsMap)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([kw, ids]) => { sorted[kw] = ids; });

    const kwData: KeywordsData = {
      keywords: sorted,
      generatedAt: new Date().toISOString(),
    };

    onProgress?.('키워드 저장 중...');
    await saveKeywords(kwData);

    // Update each exam file with keywords on individual questions
    onProgress?.('시험 파일에 키워드 반영 중...');
    for (const exam of exams) {
      const file = await ExamService.getById(exam.id);
      let changed = false;
      for (const q of file.questions) {
        const kws = questionKeywords.get(q.id);
        if (kws) {
          (q as any).keywords = kws;
          changed = true;
        }
      }
      if (changed) {
        await ExamService.save(exam.id, file);
      }
    }

    onProgress?.(`완료! ${Object.keys(sorted).length}개 키워드 추출`);
    return kwData;
  },
};
