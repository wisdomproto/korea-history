import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import { AppError } from '../middleware.js';

const NOTES_DIR = path.resolve(config.dataDir, '..', 'notes');

export interface NoteIndex {
  id: string;
  title: string;
  era: string;
  eraLabel: string;
  sectionId: string;
  order: number;
  questionCount: number;
}

export interface Note {
  id: string;
  title: string;
  era: string;
  eraLabel: string;
  sectionId: string;
  content: string;
  relatedKeywords: string[];
  relatedQuestionIds: number[];
  order: number;
}

function getIndexPath(): string {
  return path.join(NOTES_DIR, 'index.json');
}

function getNotePath(id: string): string {
  return path.join(NOTES_DIR, `${id}.json`);
}

/** Get all notes metadata (index). */
export function getAllNotes(): NoteIndex[] {
  const indexPath = getIndexPath();
  if (!fs.existsSync(indexPath)) return [];
  const raw = fs.readFileSync(indexPath, 'utf-8');
  const notes: NoteIndex[] = JSON.parse(raw);
  return notes.sort((a, b) => a.order - b.order);
}

/** Get a single note with full content. */
export function getNoteById(id: string): Note | null {
  const filePath = getNotePath(id);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/** Update a note's content and metadata. */
export function updateNote(id: string, updates: Partial<Note>): Note {
  const note = getNoteById(id);
  if (!note) throw new AppError(404, `노트를 찾을 수 없습니다: ${id}`);

  const updated = { ...note, ...updates, id }; // id is immutable
  fs.writeFileSync(getNotePath(id), JSON.stringify(updated, null, 2), 'utf-8');

  // Update index too
  const index = getAllNotes();
  const idx = index.findIndex((n) => n.id === id);
  if (idx >= 0) {
    index[idx] = {
      id: updated.id,
      title: updated.title,
      era: updated.era,
      eraLabel: updated.eraLabel,
      sectionId: updated.sectionId,
      order: updated.order,
      questionCount: updated.relatedQuestionIds.length,
    };
    fs.writeFileSync(getIndexPath(), JSON.stringify(index, null, 2), 'utf-8');
  }

  return updated;
}

/** Get stats for dashboard. */
export function getNotesStats() {
  const notes = getAllNotes();
  const bySectionId: Record<string, number> = {};
  let totalQuestions = 0;

  for (const n of notes) {
    bySectionId[n.sectionId] = (bySectionId[n.sectionId] || 0) + 1;
    totalQuestions += n.questionCount;
  }

  return {
    totalNotes: notes.length,
    totalRelatedQuestions: totalQuestions,
    bySectionId,
  };
}
