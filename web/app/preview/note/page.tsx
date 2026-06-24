import { getNoteById, getNotesIndex } from "@/lib/notes";
import NotePreviewDemo from "./NotePreviewDemo";

// 실제 요약노트 1개를 골라 미리보기 게이팅을 시연한다.
function pickNote() {
  const preferred = getNoteById("s1-01");
  if (preferred) return preferred;
  const first = getNotesIndex()[0];
  return first ? getNoteById(first.id) : null;
}

export default function PreviewNotePage() {
  const note = pickNote();

  if (!note) {
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", color: "var(--gc-subtle)" }}>
        노트 데이터를 찾지 못했습니다 (data/notes).
      </div>
    );
  }

  return (
    <NotePreviewDemo
      noteTitle={note.title}
      eraLabel={note.eraLabel}
      html={note.content}
      relatedCount={note.relatedQuestionIds.length}
    />
  );
}
