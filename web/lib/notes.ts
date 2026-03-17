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
