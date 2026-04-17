import fs from "fs";
import path from "path";

const NOTES_DIR = path.join(process.cwd(), "..", "data", "notes");

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

/** Get the notes index (all notes metadata, sorted by order). */
export function getNotesIndex(): NoteIndex[] {
  const indexPath = path.join(NOTES_DIR, "index.json");
  if (!fs.existsSync(indexPath)) return [];
  const raw = fs.readFileSync(indexPath, "utf-8");
  const index: NoteIndex[] = JSON.parse(raw);
  return index.sort((a, b) => a.order - b.order);
}

/** Get a single note by ID. */
export function getNoteById(id: string): Note | null {
  const filePath = path.join(NOTES_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as Note;
}

/** Get all note IDs (for generateStaticParams). */
export function getAllNoteIds(): string[] {
  return getNotesIndex().map((n) => n.id);
}

/** Group notes index by sectionId. */
export function getNotesGroupedBySection(): Record<string, NoteIndex[]> {
  const index = getNotesIndex();
  const grouped: Record<string, NoteIndex[]> = {};
  for (const note of index) {
    if (!grouped[note.sectionId]) grouped[note.sectionId] = [];
    grouped[note.sectionId].push(note);
  }
  return grouped;
}

/** Lazy-built reverse map: questionId → noteId[] */
let _questionNoteMap: Record<number, string[]> | null = null;

function getQuestionNoteMap(): Record<number, string[]> {
  if (_questionNoteMap) return _questionNoteMap;
  const index = getNotesIndex();
  const map: Record<number, string[]> = {};
  for (const meta of index) {
    const note = getNoteById(meta.id);
    if (!note) continue;
    for (const qid of note.relatedQuestionIds) {
      if (!map[qid]) map[qid] = [];
      map[qid].push(meta.id);
    }
  }
  _questionNoteMap = map;
  return map;
}

export interface RelatedNote {
  id: string;
  title: string;
  eraLabel: string;
  sectionId: string;
}

/** Get related notes for a question ID (max 3, deduplicated). */
export function getRelatedNotes(questionId: number): RelatedNote[] {
  const map = getQuestionNoteMap();
  const noteIds = map[questionId];
  if (!noteIds || noteIds.length === 0) return [];
  const index = getNotesIndex();
  const indexMap = new Map(index.map((n) => [n.id, n]));
  return noteIds
    .slice(0, 3)
    .map((id) => {
      const n = indexMap.get(id);
      if (!n) return null;
      return { id: n.id, title: n.title, eraLabel: n.eraLabel, sectionId: n.sectionId };
    })
    .filter(Boolean) as RelatedNote[];
}

/** Get related notes for multiple question IDs at once. */
export function getRelatedNotesForQuestions(
  questionIds: number[]
): Record<number, RelatedNote[]> {
  const map = getQuestionNoteMap();
  const index = getNotesIndex();
  const indexMap = new Map(index.map((n) => [n.id, n]));
  const result: Record<number, RelatedNote[]> = {};
  for (const qid of questionIds) {
    const noteIds = map[qid];
    if (!noteIds || noteIds.length === 0) continue;
    result[qid] = noteIds
      .slice(0, 3)
      .map((id) => {
        const n = indexMap.get(id);
        if (!n) return null;
        return { id: n.id, title: n.title, eraLabel: n.eraLabel, sectionId: n.sectionId };
      })
      .filter(Boolean) as RelatedNote[];
  }
  return result;
}

/** Get other notes from the same section (excluding current), max N. */
export function getSectionNotes(
  sectionId: string,
  excludeId: string,
  limit: number = 8
): { id: string; title: string }[] {
  return getNotesIndex()
    .filter((n) => n.sectionId === sectionId && n.id !== excludeId)
    .slice(0, limit)
    .map((n) => ({ id: n.id, title: n.title }));
}

/** Get prev/next note relative to current note. */
export function getAdjacentNotes(
  currentId: string
): { prev: NoteIndex | null; next: NoteIndex | null } {
  const index = getNotesIndex();
  const currentIdx = index.findIndex((n) => n.id === currentId);
  return {
    prev: currentIdx > 0 ? index[currentIdx - 1] : null,
    next: currentIdx < index.length - 1 ? index[currentIdx + 1] : null,
  };
}
