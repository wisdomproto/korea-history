import { getObjectText, putObject } from './r2.service.js';
import { AppError } from '../middleware.js';

const CBT_PREFIX = 'cbt';

export interface SummaryNote {
  id: string;
  categoryCode: string;
  title: string;
  examIds: string[];
  questionCount: number;
  topicCount: number;
  html: string;
  createdAt: string;
  updatedAt: string;
}

export interface SummaryNoteMeta {
  id: string;
  title: string;
  questionCount: number;
  topicCount: number;
  createdAt: string;
}

export async function listNotes(categoryCode: string): Promise<SummaryNoteMeta[]> {
  try {
    const raw = await getObjectText(`${CBT_PREFIX}/${categoryCode}/summary-notes/_index.json`);
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function getNote(categoryCode: string, noteId: string): Promise<SummaryNote> {
  try {
    const raw = await getObjectText(`${CBT_PREFIX}/${categoryCode}/summary-notes/${noteId}.json`);
    return JSON.parse(raw);
  } catch (err: any) {
    throw new AppError(404, `요약노트 '${noteId}'를 찾을 수 없습니다.`);
  }
}

export async function saveNote(note: SummaryNote): Promise<void> {
  const key = `${CBT_PREFIX}/${note.categoryCode}/summary-notes/${note.id}.json`;
  await putObject(key, JSON.stringify(note, null, 2));
  await updateIndex(note.categoryCode, note);
}

async function updateIndex(categoryCode: string, note: SummaryNote): Promise<void> {
  const notes = await listNotes(categoryCode);
  const meta: SummaryNoteMeta = {
    id: note.id,
    title: note.title,
    questionCount: note.questionCount,
    topicCount: note.topicCount,
    createdAt: note.createdAt,
  };
  const idx = notes.findIndex((n) => n.id === note.id);
  if (idx >= 0) notes[idx] = meta;
  else notes.unshift(meta);
  await putObject(`${CBT_PREFIX}/${categoryCode}/summary-notes/_index.json`, JSON.stringify(notes, null, 2));
}
