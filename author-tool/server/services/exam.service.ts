import fs from 'fs/promises';
import path from 'path';
import { putObject, getObjectText, deleteObject, listObjects, getPublicUrl } from './r2.service.js';
import { config } from '../config.js';
import { AppError } from '../middleware.js';

export interface Exam {
  id: number;
  examNumber: number;
  name?: string;
  examDate: string;
  examType: 'advanced' | 'basic';
  totalQuestions: number;
  timeLimitMinutes: number;
  isFree: boolean;
  isVisible?: boolean;
}

export interface Question {
  id: number;
  examId: number;
  questionNumber: number;
  content: string;
  /** @deprecated Source materials are image-only (imageUrl). Kept for backward compat. */
  passage?: string;
  imageUrl?: string;
  choices: [string, string, string, string, string];
  choiceImages?: (string | null)[];
  correctAnswer: number;
  points: number;
  era: string;
  category: string;
  difficulty: 1 | 2 | 3;
}

export interface ExamFile {
  exam: Exam;
  questions: Question[];
}

const QUESTIONS_PREFIX = 'questions/';
const ORDER_KEY = 'questions/exam-order.json';
const MANIFEST_KEY = 'manifest.json';

// Lightweight in-memory index: id → examNumber (populated by list(), used by getById())
const idToExamNumber = new Map<number, number>();

async function regenerateManifest(): Promise<void> {
  const files = await getExamFiles();
  const entries: { id: number; examNumber: number; filename: string; exam: Exam }[] = [];

  for (const f of files) {
    const data = await readExamFile(f);
    entries.push({ id: data.exam.id, examNumber: data.exam.examNumber, filename: f, exam: data.exam });
  }

  entries.sort((a, b) => b.examNumber - a.examNumber);

  const manifest = {
    generatedAt: new Date().toISOString(),
    exams: entries.map((e) => ({
      ...e.exam,
      url: getPublicUrl(`${QUESTIONS_PREFIX}${e.filename}`),
    })),
  };

  await putObject(MANIFEST_KEY, JSON.stringify(manifest, null, 2), 'application/json');
  console.log('[ExamService] Regenerated manifest.json on R2');
}

async function readOrder(): Promise<number[]> {
  try {
    const text = await getObjectText(ORDER_KEY);
    return JSON.parse(text) as number[];
  } catch {
    return [];
  }
}

async function writeOrder(ids: number[]): Promise<void> {
  await putObject(ORDER_KEY, JSON.stringify(ids), 'application/json');
}

async function getExamFiles(): Promise<string[]> {
  const keys = await listObjects(QUESTIONS_PREFIX);
  return keys
    .map((k) => k.replace(QUESTIONS_PREFIX, ''))
    .filter((f) => f.startsWith('exam-') && f.endsWith('.json') && f !== 'exam-order.json')
    .sort();
}

async function readExamFile(filename: string): Promise<ExamFile> {
  const text = await getObjectText(`${QUESTIONS_PREFIX}${filename}`);
  return JSON.parse(text) as ExamFile;
}

async function writeExamFile(filename: string, data: ExamFile): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  await putObject(`${QUESTIONS_PREFIX}${filename}`, json, 'application/json');
  // Sync to local file for Expo dev
  await syncLocalFile(filename, json);
}

/** Write exam JSON to local data/questions/ and regenerate data/exams.ts */
async function syncLocalFile(filename: string, json: string): Promise<void> {
  try {
    const localPath = path.join(config.dataDir, filename);
    await fs.writeFile(localPath, json, 'utf-8');
    await regenerateExamsModule();
    console.log(`[Sync] ${filename} → local + exams.ts`);
  } catch (err) {
    console.error('[Sync] Local sync failed:', err);
  }
}

/** Delete local exam file and regenerate exams.ts */
async function deleteLocalFile(filename: string): Promise<void> {
  try {
    const localPath = path.join(config.dataDir, filename);
    await fs.unlink(localPath).catch(() => {});
    await regenerateExamsModule();
    console.log(`[Sync] Deleted local ${filename}`);
  } catch (err) {
    console.error('[Sync] Local delete failed:', err);
  }
}

/** Auto-generate data/exams.ts from all local exam-*.json files */
async function regenerateExamsModule(): Promise<void> {
  const files = await fs.readdir(config.dataDir);
  const examFiles = files
    .filter((f) => f.startsWith('exam-') && f.endsWith('.json') && f !== 'exam-order.json')
    .sort();

  // Read each file to get examNumber for sorting
  const entries: { file: string; varName: string; examNumber: number }[] = [];
  for (const f of examFiles) {
    const raw = await fs.readFile(path.join(config.dataDir, f), 'utf-8');
    const data = JSON.parse(raw) as ExamFile;
    const num = f.replace('exam-', '').replace('.json', '');
    entries.push({ file: f, varName: `exam${num}Data`, examNumber: data.exam.examNumber });
  }

  // Sort by examNumber descending (newest first)
  entries.sort((a, b) => b.examNumber - a.examNumber);

  const imports = entries.map((e) => `import ${e.varName} from './questions/${e.file}';`).join('\n');
  const examsList = entries.map((e) => `  ${e.varName}.exam as Exam,`).join('\n');
  const questionsMap = entries.map((e) => `  [${e.varName}.exam.id]: ${e.varName}.questions as Question[],`).join('\n');

  const module = `import { Exam, Question } from '../lib/types';
${imports}

// Auto-generated — do not edit manually
// 회차 목록 (최신순)
export const EXAMS: Exam[] = [
${examsList}
];

const questionsMap: Record<number, Question[]> = {
${questionsMap}
};

export function getExamById(examId: number): Exam | undefined {
  return EXAMS.find((e) => e.id === examId);
}

export function getQuestionsByExamId(examId: number): Question[] {
  return questionsMap[examId] || [];
}

export function getAllQuestions(): Question[] {
  return Object.values(questionsMap).flat();
}

export function getQuestionById(questionId: number): Question | undefined {
  for (const questions of Object.values(questionsMap)) {
    const found = questions.find((q) => q.id === questionId);
    if (found) return found;
  }
  return undefined;
}
`;

  const examsPath = path.resolve(config.dataDir, '../exams.ts');
  await fs.writeFile(examsPath, module, 'utf-8');
}

export const ExamService = {
  async list(): Promise<(Exam & { questionCount: number })[]> {
    const files = await getExamFiles();
    const all = await Promise.all(
      files.map(async (f) => {
        const data = await readExamFile(f);
        // Populate id→examNumber index for fast getById()
        idToExamNumber.set(data.exam.id, data.exam.examNumber);
        return { ...data.exam, questionCount: data.questions.length };
      }),
    );
    const order = await readOrder();
    if (order.length > 0) {
      const map = new Map(all.map((e) => [e.id, e]));
      const ordered: typeof all = [];
      for (const id of order) {
        const e = map.get(id);
        if (e) {
          ordered.push(e);
          map.delete(id);
        }
      }
      for (const e of map.values()) ordered.push(e);
      return ordered;
    }
    return all;
  },

  async getById(id: number): Promise<ExamFile> {
    // Fast path: use index from list() to read a single file
    const examNumber = idToExamNumber.get(id);
    if (examNumber !== undefined) {
      try {
        return await readExamFile(`exam-${examNumber}.json`);
      } catch {
        // Index stale — fall through to scan
      }
    }
    // Slow fallback: scan all files (also rebuilds index)
    const files = await getExamFiles();
    for (const f of files) {
      const data = await readExamFile(f);
      idToExamNumber.set(data.exam.id, data.exam.examNumber);
      if (data.exam.id === id) return data;
    }
    throw new AppError(404, `시험 ID ${id}을 찾을 수 없습니다.`);
  },

  async getByExamNumber(examNumber: number): Promise<ExamFile | null> {
    try {
      return await readExamFile(`exam-${examNumber}.json`);
    } catch {
      return null;
    }
  },

  async create(exam: Omit<Exam, 'id'>): Promise<ExamFile> {
    const existing = await ExamService.list();
    const maxId = existing.length > 0 ? Math.max(...existing.map((e) => e.id)) : 0;
    const newExam: Exam = { ...exam, id: maxId + 1 } as Exam;
    const data: ExamFile = { exam: newExam, questions: [] };
    const filename = `exam-${exam.examNumber}.json`;

    // Check existence
    const existingExam = await ExamService.getByExamNumber(exam.examNumber);
    if (existingExam) {
      throw new AppError(400, `시험 ${exam.examNumber}회가 이미 존재합니다.`);
    }

    await writeExamFile(filename, data);
    await regenerateManifest();
    return data;
  },

  async update(id: number, updates: Partial<Omit<Exam, 'id'>>): Promise<ExamFile> {
    const files = await getExamFiles();
    for (const f of files) {
      const data = await readExamFile(f);
      if (data.exam.id === id) {
        const oldExamNumber = data.exam.examNumber;
        data.exam = { ...data.exam, ...updates };

        if (updates.examNumber && updates.examNumber !== oldExamNumber) {
          const newFilename = `exam-${updates.examNumber}.json`;
          await writeExamFile(newFilename, data);
          await deleteObject(`${QUESTIONS_PREFIX}${f}`);
          await deleteLocalFile(f);
        } else {
          await writeExamFile(f, data);
        }
        await regenerateManifest();
        return data;
      }
    }
    throw new AppError(404, `시험 ID ${id}을 찾을 수 없습니다.`);
  },

  async delete(id: number): Promise<void> {
    const files = await getExamFiles();
    for (const f of files) {
      const data = await readExamFile(f);
      if (data.exam.id === id) {
        await deleteObject(`${QUESTIONS_PREFIX}${f}`);
        await deleteLocalFile(f);
        const order = (await readOrder()).filter((eid) => eid !== id);
        await writeOrder(order);
        await regenerateManifest();
        return;
      }
    }
    throw new AppError(404, `시험 ID ${id}을 찾을 수 없습니다.`);
  },

  async reorder(examIds: number[]): Promise<void> {
    await writeOrder(examIds);
  },

  /** Pull all exams from R2 to local files + regenerate exams.ts */
  async syncToLocal(): Promise<number> {
    const files = await getExamFiles();
    for (const f of files) {
      const data = await readExamFile(f);
      const json = JSON.stringify(data, null, 2);
      const localPath = path.join(config.dataDir, f);
      await fs.writeFile(localPath, json, 'utf-8');
    }
    await regenerateExamsModule();
    console.log(`[Sync] Synced ${files.length} exams from R2 to local`);
    return files.length;
  },

  async save(id: number, examFile: ExamFile): Promise<ExamFile> {
    const files = await getExamFiles();
    for (const f of files) {
      const data = await readExamFile(f);
      if (data.exam.id === id) {
        await writeExamFile(f, examFile);
        return examFile;
      }
    }
    throw new AppError(404, `시험 ID ${id}을 찾을 수 없습니다.`);
  },
};
