import { putObject, getObjectText, deleteObject, listObjects, getPublicUrl } from './r2.service.js';
import { AppError } from '../middleware.js';

export interface Exam {
  id: number;
  examNumber: number;
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
  await putObject(
    `${QUESTIONS_PREFIX}${filename}`,
    JSON.stringify(data, null, 2),
    'application/json',
  );
}

export const ExamService = {
  async list(): Promise<(Exam & { questionCount: number })[]> {
    const files = await getExamFiles();
    const all = await Promise.all(
      files.map(async (f) => {
        const data = await readExamFile(f);
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
    const files = await getExamFiles();
    for (const f of files) {
      const data = await readExamFile(f);
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
